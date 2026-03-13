from pydantic import BaseModel
from typing import Optional, List

class StudentOut(BaseModel):
    id: str
    student_id: str
    name_ar: str
    name_en: str
    program_id: str
    program_name: Optional[str] = None
    advisor_id: Optional[str] = None
    advisor_name: Optional[str] = None
    current_level: int
    gpa: float
    passed_courses: List[str] = []
    failed_courses: List[str] = []

class StudentUpdate(BaseModel):
    advisor_id: Optional[str] = None
    current_level: Optional[int] = None
    gpa: Optional[float] = None
    passed_courses: Optional[List[str]] = None
    failed_courses: Optional[List[str]] = None

class ImportResult(BaseModel):
    total: int
    inserted: int
    updated: int
    skipped: int
    errors: List[str] = []