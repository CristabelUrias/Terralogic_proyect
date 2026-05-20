from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

# Lo que recibimos del Frontend al registrar
class UserCreate(BaseModel):
    email: str
    password: str
    display_name: str
    role: Optional[str] = "productor"

# Lo que devolvemos al Frontend (sin la contraseña)
class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    display_name: Optional[str]
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str