from fastapi import APIRouter, HTTPException, Depends
from core.dependencies import get_current_user, require_admin
from schemas.registration import (
    RegistrationOut, RegistrationCourseOut,
    AddCourseRequest, UpdateFlagsRequest
)
from services.rule_engine import check_registration_rules
from database import get_db
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/registrations", tags=["Registration"])


def is_window_open(semester: dict) -> bool:
    now = datetime.now(timezone.utc)
    open_at = semester.get("window_open_at")
    close_at = semester.get("window_close_at")

    if not open_at:
        return False

    open_dt = datetime.fromisoformat(open_at.replace("Z", "+00:00"))
    if now < open_dt:
        return False

    if close_at:
        close_dt = datetime.fromisoformat(close_at.replace("Z", "+00:00"))
        if now > close_dt:
            return False

    return True


def build_registration_out(reg: dict, db) -> RegistrationOut:
    # Get student
    student = db.table("students").select(
        "student_id, name_en, name_ar"
    ).eq("id", reg["student_id"]).execute().data[0]

    # Get courses
    reg_courses = db.table("registration_courses").select(
        "course_id, courses(code, name_en, credit_hours)"
    ).eq("registration_id", reg["id"]).execute()

    courses = []
    total_credits = 0
    for rc in reg_courses.data:
        c = rc.get("courses", {})
        if c:
            courses.append(RegistrationCourseOut(
                course_id=rc["course_id"],
                code=c["code"],
                name_en=c["name_en"],
                credit_hours=c["credit_hours"]
            ))
            total_credits += c["credit_hours"]

    return RegistrationOut(
        id=reg["id"],
        student_id=reg["student_id"],
        student_name_en=student["name_en"],
        student_name_ar=student["name_ar"],
        semester_id=reg["semester_id"],
        status=reg["status"],
        total_credit_hours=total_credits,
        sis_checked=reg.get("sis_checked", False),
        payment_checked=reg.get("payment_checked", False),
        courses=courses,
        submitted_at=reg.get("submitted_at")
    )


@router.get("/student/{student_id}", response_model=RegistrationOut)
def get_student_registration(student_id: str, user=Depends(get_current_user)):
    db = get_db()

    # Get active semester
    semester_result = db.table("semesters").select("*").eq("is_active", True).execute()
    if not semester_result.data:
        raise HTTPException(status_code=404, detail="No active semester")

    semester = semester_result.data[0]

    # Get or create registration
    reg_result = db.table("registrations").select("*").eq(
        "student_id", student_id
    ).eq("semester_id", semester["id"]).execute()

    if not reg_result.data:
        # Create empty draft registration
        new_reg = {
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "semester_id": semester["id"],
            "status": "draft",
            "total_credit_hours": 0,
            "sis_checked": False,
            "payment_checked": False,
        }
        db.table("registrations").insert(new_reg).execute()
        reg = new_reg
    else:
        reg = reg_result.data[0]

    return build_registration_out(reg, db)


@router.post("/student/{student_id}/add-course", response_model=RegistrationOut)
def add_course(
    student_id: str,
    request: AddCourseRequest,
    user=Depends(get_current_user)
):
    db = get_db()

    # Get active semester
    semester_result = db.table("semesters").select("*").eq("is_active", True).execute()
    if not semester_result.data:
        raise HTTPException(status_code=404, detail="No active semester")

    semester = semester_result.data[0]

    # Check window is open
    if not is_window_open(semester):
        raise HTTPException(status_code=403, detail="Registration window is closed")

    # Get student
    student_result = db.table("students").select("*").eq("id", student_id).execute()
    if not student_result.data:
        raise HTTPException(status_code=404, detail="Student not found")

    student = student_result.data[0]

    # Advisor can only modify their own students
    if user["role"] == "advisor" and student.get("advisor_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get registration
    reg_result = db.table("registrations").select("*").eq(
        "student_id", student_id
    ).eq("semester_id", semester["id"]).execute()

    if not reg_result.data:
        reg = {
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "semester_id": semester["id"],
            "status": "draft",
            "total_credit_hours": 0,
            "sis_checked": False,
            "payment_checked": False,
        }
        db.table("registrations").insert(reg).execute()
    else:
        reg = reg_result.data[0]

    if reg["status"] == "locked":
        raise HTTPException(status_code=403, detail="Registration is locked")

    # Get current course ids
    current_courses = db.table("registration_courses").select("course_id").eq(
        "registration_id", reg["id"]
    ).execute()
    current_course_ids = [rc["course_id"] for rc in current_courses.data]

    # Check course is activated for this semester
    activated = db.table("semester_courses").select("id").eq(
        "semester_id", semester["id"]
    ).eq("course_id", request.course_id).execute()

    if not activated.data:
        raise HTTPException(status_code=400, detail="Course is not activated for this semester")

    # Run business rules
    check = check_registration_rules(student, request.course_id, current_course_ids)
    if not check["allowed"]:
        raise HTTPException(status_code=400, detail=check["reason"])

    # Add course
    db.table("registration_courses").insert({
        "id": str(uuid.uuid4()),
        "registration_id": reg["id"],
        "course_id": request.course_id,
    }).execute()

    # Log
    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "ADD_COURSE",
        "target_type": "registration",
        "target_id": reg["id"],
        "detail": {"course_id": request.course_id, "student_id": student_id}
    }).execute()

    return build_registration_out(reg, db)


@router.delete("/student/{student_id}/remove-course/{course_id}",
               response_model=RegistrationOut)
def remove_course(
    student_id: str,
    course_id: str,
    user=Depends(get_current_user)
):
    db = get_db()

    semester_result = db.table("semesters").select("*").eq("is_active", True).execute()
    if not semester_result.data:
        raise HTTPException(status_code=404, detail="No active semester")

    semester = semester_result.data[0]

    if not is_window_open(semester):
        raise HTTPException(status_code=403, detail="Registration window is closed")

    reg_result = db.table("registrations").select("*").eq(
        "student_id", student_id
    ).eq("semester_id", semester["id"]).execute()

    if not reg_result.data:
        raise HTTPException(status_code=404, detail="Registration not found")

    reg = reg_result.data[0]

    if reg["status"] == "locked":
        raise HTTPException(status_code=403, detail="Registration is locked")

    db.table("registration_courses").delete().eq(
        "registration_id", reg["id"]
    ).eq("course_id", course_id).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "REMOVE_COURSE",
        "target_type": "registration",
        "target_id": reg["id"],
        "detail": {"course_id": course_id}
    }).execute()

    return build_registration_out(reg, db)


@router.post("/student/{student_id}/submit", response_model=RegistrationOut)
def submit_registration(student_id: str, user=Depends(get_current_user)):
    db = get_db()

    semester_result = db.table("semesters").select("*").eq("is_active", True).execute()
    if not semester_result.data:
        raise HTTPException(status_code=404, detail="No active semester")

    semester = semester_result.data[0]

    if not is_window_open(semester):
        raise HTTPException(status_code=403, detail="Registration window is closed")

    reg_result = db.table("registrations").select("*").eq(
        "student_id", student_id
    ).eq("semester_id", semester["id"]).execute()

    if not reg_result.data:
        raise HTTPException(status_code=404, detail="Registration not found")

    reg = reg_result.data[0]

    if reg["status"] == "locked":
        raise HTTPException(status_code=403, detail="Registration is locked")

    db.table("registrations").update({
        "status": "submitted",
        "submitted_by": user["id"],
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", reg["id"]).execute()

    reg["status"] = "submitted"

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "SUBMIT_REGISTRATION",
        "target_type": "registration",
        "target_id": reg["id"],
        "detail": {"student_id": student_id}
    }).execute()

    return build_registration_out(reg, db)


@router.patch("/student/{student_id}/flags", response_model=RegistrationOut)
def update_flags(
    student_id: str,
    request: UpdateFlagsRequest,
    user=Depends(get_current_user)
):
    db = get_db()

    semester_result = db.table("semesters").select("*").eq("is_active", True).execute()
    if not semester_result.data:
        raise HTTPException(status_code=404, detail="No active semester")

    semester = semester_result.data[0]

    reg_result = db.table("registrations").select("*").eq(
        "student_id", student_id
    ).eq("semester_id", semester["id"]).execute()

    if not reg_result.data:
        raise HTTPException(status_code=404, detail="Registration not found")

    reg = reg_result.data[0]

    update_data = {}
    if request.sis_checked is not None:
        update_data["sis_checked"] = request.sis_checked
    if request.payment_checked is not None:
        update_data["payment_checked"] = request.payment_checked

    if update_data:
        db.table("registrations").update(update_data).eq("id", reg["id"]).execute()
        reg.update(update_data)

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "UPDATE_FLAGS",
        "target_type": "registration",
        "target_id": reg["id"],
        "detail": update_data
    }).execute()

    return build_registration_out(reg, db)


@router.post("/student/{student_id}/reset")
def reset_registration(student_id: str, user=Depends(get_current_user)):
    db = get_db()

    semester_result = db.table("semesters").select("*").eq("is_active", True).execute()
    if not semester_result.data:
        raise HTTPException(status_code=404, detail="No active semester found")

    semester = semester_result.data[0]

    reg_result = db.table("registrations").select("*").eq(
        "student_id", student_id
    ).eq("semester_id", semester["id"]).execute()

    if not reg_result.data:
        raise HTTPException(status_code=404, detail="No registration found for student")

    reg = reg_result.data[0]

    if reg["status"] == "locked":
        raise HTTPException(status_code=403, detail="Registration is locked and cannot be reset")

    # Delete all registration courses
    db.table("registration_courses").delete().eq("registration_id", reg["id"]).execute()

    # Reset to draft — keep sis and payment flags untouched
    db.table("registrations").update({
        "status": "draft",
        "submitted_at": None,
        "submitted_by": None,
        "total_credit_hours": 0,
    }).eq("id", reg["id"]).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "RESET_REGISTRATION",
        "target_type": "registration",
        "target_id": reg["id"],
        "detail": {"student_id": student_id}
    }).execute()

    return {"message": "Registration reset successfully"}