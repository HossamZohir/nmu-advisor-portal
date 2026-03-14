from fastapi import APIRouter, HTTPException, Depends
from core.dependencies import require_admin, require_dean
from database import get_db
from pydantic import BaseModel
from typing import Optional
import uuid
import bcrypt

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreate(BaseModel):
    name_en: str
    name_ar: str
    email: str
    password: str
    role: str
    department_id: Optional[str] = None

class UserUpdate(BaseModel):
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/")
def get_users(user=Depends(require_admin)):
    db = get_db()
    result = db.table("users").select(
        "id, name_en, name_ar, email, role, is_active, department_id, departments(name_en)"
    ).order("created_at", desc=True).execute()

    users = []
    for u in result.data:
        dept = u.get("departments", {})
        users.append({
            **{k: v for k, v in u.items() if k != "departments"},
            "department_name": dept.get("name_en") if dept else None
        })
    return users

@router.post("/")
def create_user(data: UserCreate, user=Depends(require_admin)):
    db = get_db()

    # Check email unique
    existing = db.table("users").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Validate role
    if data.role not in ["advisor", "dept_admin", "dean"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Only dean can create dept_admin or dean
    if data.role in ["dept_admin", "dean"] and user["role"] != "dean":
        raise HTTPException(status_code=403, detail="Only dean can create admins")

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

    new_user = {
        "id": str(uuid.uuid4()),
        "name_en": data.name_en,
        "name_ar": data.name_ar,
        "email": data.email,
        "hashed_password": hashed,
        "role": data.role,
        "department_id": data.department_id if data.department_id else None,
        "is_active": True,
    }

    result = db.table("users").insert(new_user).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "CREATE_USER",
        "target_type": "user",
        "target_id": new_user["id"],
        "detail": {"email": data.email, "role": data.role}
    }).execute()

    return {"message": "User created successfully", "id": new_user["id"]}

@router.patch("/{user_id}")
def update_user(user_id: str, data: UserUpdate, user=Depends(require_admin)):
    db = get_db()

    update_data = {}
    if data.name_en: update_data["name_en"] = data.name_en
    if data.name_ar: update_data["name_ar"] = data.name_ar
    if data.email: update_data["email"] = data.email
    if data.role: update_data["role"] = data.role
    if data.is_active is not None: update_data["is_active"] = data.is_active
    if data.password:
        update_data["hashed_password"] = bcrypt.hashpw(
            data.password.encode(), bcrypt.gensalt()
        ).decode()

    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    db.table("users").update(update_data).eq("id", user_id).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "UPDATE_USER",
        "target_type": "user",
        "target_id": user_id,
        "detail": {k: v for k, v in update_data.items() if k != "hashed_password"}
    }).execute()

    return {"message": "User updated successfully"}

@router.delete("/{user_id}")
def deactivate_user(user_id: str, user=Depends(require_dean)):
    db = get_db()

    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    db.table("users").update({"is_active": False}).eq("id", user_id).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "DEACTIVATE_USER",
        "target_type": "user",
        "target_id": user_id,
        "detail": {}
    }).execute()

    return {"message": "User deactivated"}