from pydantic import BaseModel
from typing import Optional, List

class RegistrationCourseOut(BaseModel):
    course_id: str
    code: str
    name_en: str
    credit_hours: int

class RegistrationOut(BaseModel):
    id: str
    student_id: str
    student_name_en: str
    student_name_ar: str
    semester_id: str
    status: str
    total_credit_hours: int
    sis_checked: bool
    payment_checked: bool
    courses: List[RegistrationCourseOut] = []
    submitted_at: Optional[str] = None

class AddCourseRequest(BaseModel):
    course_id: str

class RemoveCourseRequest(BaseModel):
    course_id: str

class UpdateFlagsRequest(BaseModel):
    sis_checked: Optional[bool] = None
    payment_checked: Optional[bool] = None