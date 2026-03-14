from pydantic import BaseModel
from typing import List, Optional

class JoinQueueRequest(BaseModel):
    user_id: str
    name: str

class QueueStatusResponse(BaseModel):
    queue_id: str
    active_users: List[dict]
    total_waiting: int

class CallNextResponse(BaseModel):
    queue_id: str
    called_user: Optional[dict]
    remaining_waiting: int

class UserPositionResponse(BaseModel):
    queue_id: str
    user_id: str
    position: Optional[int]
