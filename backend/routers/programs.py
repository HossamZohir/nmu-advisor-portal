from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from database import get_db

router = APIRouter(prefix="/programs", tags=["Programs"])

@router.get("/")
def get_programs(user=Depends(get_current_user)):
    db = get_db()
    result = db.table("programs").select("id, name_en, name_ar, department_id").execute()
    return result.data