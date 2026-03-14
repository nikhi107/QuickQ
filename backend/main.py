import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from models import JoinQueueRequest, QueueStatusResponse, CallNextResponse, UserPositionResponse
from redis_client import QueueManager, redis_client
import database
import db_models
import auth

# Initialize Database tables
db_models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="QuickQ API V2")

# Setup CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except auth.jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(db_models.AdminUser).filter(db_models.AdminUser.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Admin not found")
    return user

@app.on_event("startup")
def startup_event():
    # Seed default admin user
    db = database.SessionLocal()
    admin = db.query(db_models.AdminUser).filter(db_models.AdminUser.username == "admin").first()
    if not admin:
        hashed_pw = auth.get_password_hash("admin123")
        new_admin = db_models.AdminUser(username="admin", password_hash=hashed_pw)
        db.add(new_admin)
        db.commit()
    db.close()


# Connection manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, queue_id: str):
        await websocket.accept()
        if queue_id not in self.active_connections:
            self.active_connections[queue_id] = []
        self.active_connections[queue_id].append(websocket)

    def disconnect(self, websocket: WebSocket, queue_id: str):
        if queue_id in self.active_connections and websocket in self.active_connections[queue_id]:
            self.active_connections[queue_id].remove(websocket)
            if not self.active_connections[queue_id]:
                del self.active_connections[queue_id]

    async def broadcast_queue_update(self, queue_id: str):
        if queue_id in self.active_connections:
            status = QueueManager.get_status(queue_id)
            message = {
                "type": "QUEUE_UPDATE",
                "queue_id": queue_id,
                "active_users": status,
                "total_waiting": len(status)
            }
            json_msg = json.dumps(message)
            tasks = []
            for connection in self.active_connections[queue_id]:
                tasks.append(connection.send_text(json_msg))
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

manager = ConnectionManager()

class AdminSignupRequest(BaseModel):
    username: str
    password: str

@app.post("/admin/signup")
def signup_admin(req: AdminSignupRequest, db: Session = Depends(database.get_db)):
    # Check if user already exists
    existing_user = db.query(db_models.AdminUser).filter(db_models.AdminUser.username == req.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pw = auth.get_password_hash(req.password)
    new_admin = db_models.AdminUser(username=req.username, password_hash=hashed_pw)
    db.add(new_admin)
    db.commit()
    
    # Automatically log them in
    access_token = auth.create_access_token(data={"sub": new_admin.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/admin/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(db_models.AdminUser).filter(db_models.AdminUser.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/analytics/history")
def get_analytics(db: Session = Depends(database.get_db), current_user: db_models.AdminUser = Depends(get_current_admin)):
    # Calculate average wait time
    avg_wait = db.query(func.avg(db_models.UserHistory.wait_time_seconds)).filter(db_models.UserHistory.called_at != None).scalar()
    # Total served
    total_served = db.query(func.count(db_models.UserHistory.id)).filter(db_models.UserHistory.called_at != None).scalar()
    
    return {
        "average_wait_time_seconds": avg_wait or 0,
        "total_served": total_served or 0
    }

@app.post("/queue/{queue_id}/join")
async def join_queue(queue_id: str, req: JoinQueueRequest, db: Session = Depends(database.get_db)):
    position = QueueManager.join(queue_id, req.user_id, req.name)
    
    # Save to history DB
    history_record = db_models.UserHistory(
        queue_id=queue_id,
        user_id=req.user_id,
        name=req.name
    )
    db.add(history_record)
    db.commit()

    await manager.broadcast_queue_update(queue_id)
    return {"message": "Joined queue successfully", "position": position}

@app.get("/queue/{queue_id}/status", response_model=QueueStatusResponse)
def get_queue_status(queue_id: str):
    users = QueueManager.get_status(queue_id)
    return QueueStatusResponse(
        queue_id=queue_id,
        active_users=users,
        total_waiting=len(users)
    )

@app.post("/queue/{queue_id}/next", response_model=CallNextResponse)
async def call_next(queue_id: str, db: Session = Depends(database.get_db), current_user: db_models.AdminUser = Depends(get_current_admin)):
    called_user = QueueManager.call_next(queue_id)
    
    if called_user:
        # Update history DB
        record = db.query(db_models.UserHistory).filter(
            db_models.UserHistory.user_id == called_user["user_id"],
            db_models.UserHistory.called_at == None
        ).order_by(db_models.UserHistory.id.desc()).first()
        
        if record:
            record.called_at = datetime.now(timezone.utc)
            record.wait_time_seconds = (record.called_at - record.joined_at.replace(tzinfo=timezone.utc)).total_seconds()
            db.commit()

    await manager.broadcast_queue_update(queue_id)
    users = QueueManager.get_status(queue_id)
    return CallNextResponse(
        queue_id=queue_id,
        called_user=called_user,
        remaining_waiting=len(users)
    )

@app.post("/queue/{queue_id}/leave/{user_id}")
async def leave_queue(queue_id: str, user_id: str):
    success = QueueManager.leave(queue_id, user_id)
    if success:
        # We could also delete or mark abandoned in UserHistory, but skipping for brevity
        await manager.broadcast_queue_update(queue_id)
        return {"message": "Left queue safely"}
    raise HTTPException(status_code=404, detail="User not found in queue")

@app.get("/queue/{queue_id}/position/{user_id}", response_model=UserPositionResponse)
def get_user_position(queue_id: str, user_id: str):
    position = QueueManager.get_position(queue_id, user_id)
    return UserPositionResponse(
        queue_id=queue_id,
        user_id=user_id,
        position=position
    )

@app.websocket("/ws/queue/{queue_id}")
async def websocket_endpoint(websocket: WebSocket, queue_id: str):
    await manager.connect(websocket, queue_id)
    try:
        status = QueueManager.get_status(queue_id)
        await websocket.send_json({
            "type": "QUEUE_UPDATE",
            "queue_id": queue_id,
            "active_users": status,
            "total_waiting": len(status)
        })
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, queue_id)
