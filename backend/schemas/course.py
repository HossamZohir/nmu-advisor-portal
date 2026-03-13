from pydantic import BaseModel
from typing import Optional, List

class CourseOut(BaseModel):
    id: str
    code: str
    name_en: str
    name_ar: Optional[str] = None
    credit_hours: int
    prerequisites: List[str] = []

class SemesterCreate(BaseModel):
    name: str
    window_open_at: Optional[str] = None
    window_close_at: Optional[str] = None

class SemesterOut(BaseModel):
    id: str
    name: str
    is_active: bool
    window_open_at: Optional[str] = None
    window_close_at: Optional[str] = None

class ActivateCourseRequest(BaseModel):
    course_ids: List[str]