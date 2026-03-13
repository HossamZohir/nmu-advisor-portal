from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name_ar: str
    name_en: str
    role: str
    department_id: Optional[str] = None

class UserOut(BaseModel):
    id: str
    name_ar: str
    name_en: str
    email: str
    role: str
    department_id: Optional[str] = None
    is_active: bool