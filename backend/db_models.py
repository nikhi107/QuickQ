from sqlalchemy import Column, Integer, String, DateTime, Float
from datetime import datetime, timezone
from database import Base

class UserHistory(Base):
    __tablename__ = "user_history"

    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(String, index=True)
    user_id = Column(String, index=True)
    name = Column(String)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    called_at = Column(DateTime, nullable=True)
    wait_time_seconds = Column(Float, nullable=True)

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
