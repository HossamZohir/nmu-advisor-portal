from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from database import get_db

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("/")
def get_departments(user=Depends(get_current_user)):
    db = get_db()
    result = db.table("departments").select("*").execute()
    return result.data