from sqlalchemy import Column, String, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    # Usamos 'id' como primary key (UUID real en la BD)
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uid           = Column(String(128), nullable=True)  # legacy — no se usa como PK
    display_name  = Column(String(150))
    email         = Column(String(254), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(50), default="client")
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class PendingUser(Base):
    __tablename__ = "pending_users"

    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String(254), unique=True, index=True, nullable=False)
    display_name     = Column(String(150), nullable=False)
    hashed_password  = Column(String(255), nullable=False)
    otp_code         = Column(String(6), nullable=False)
    expires_at       = Column(DateTime(timezone=True), nullable=False)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())