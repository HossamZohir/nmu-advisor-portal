from fastapi import APIRouter, HTTPException, Depends
from core.dependencies import get_current_user, require_admin, require_dean
from schemas.course import CourseOut, SemesterCreate, SemesterOut, ActivateCourseRequest
from database import get_db
import uuid

router = APIRouter(tags=["Courses & Semesters"])

# =============================================
# COURSES
# =============================================

@router.get("/courses", response_model=list[CourseOut])
def get_all_courses(user=Depends(get_current_user)):
    db = get_db()
    result = db.table("courses").select("*").order("code").execute()

    # Get prerequisites
    prereqs = db.table("prerequisites").select(
        "course_id, courses!prerequisites_prerequisite_course_id_fkey(code)"
    ).execute()

    prereq_map = {}
    for p in prereqs.data:
        cid = p["course_id"]
        code = p.get("courses", {}).get("code", "")
        if cid not in prereq_map:
            prereq_map[cid] = []
        if code:
            prereq_map[cid].append(code)

    courses = []
    for c in result.data:
        courses.append(CourseOut(
            id=c["id"],
            code=c["code"],
            name_en=c["name_en"],
            name_ar=c.get("name_ar"),
            credit_hours=c["credit_hours"],
            prerequisites=prereq_map.get(c["id"], [])
        ))

    return courses


@router.get("/courses/semester/{semester_id}", response_model=list[CourseOut])
def get_semester_courses(semester_id: str, user=Depends(get_current_user)):
    """Get all activated courses for a specific semester"""
    db = get_db()

    result = db.table("semester_courses").select(
        "course_id, courses(id, code, name_en, name_ar, credit_hours)"
    ).eq("semester_id", semester_id).execute()

    # Get prerequisites
    prereqs = db.table("prerequisites").select(
        "course_id, courses!prerequisites_prerequisite_course_id_fkey(code)"
    ).execute()

    prereq_map = {}
    for p in prereqs.data:
        cid = p["course_id"]
        code = p.get("courses", {}).get("code", "")
        if cid not in prereq_map:
            prereq_map[cid] = []
        if code:
            prereq_map[cid].append(code)

    courses = []
    for sc in result.data:
        c = sc.get("courses", {})
        if c:
            courses.append(CourseOut(
                id=c["id"],
                code=c["code"],
                name_en=c["name_en"],
                name_ar=c.get("name_ar"),
                credit_hours=c["credit_hours"],
                prerequisites=prereq_map.get(c["id"], [])
            ))

    return courses


# =============================================
# SEMESTERS
# =============================================

@router.get("/semesters", response_model=list[SemesterOut])
def get_semesters(user=Depends(get_current_user)):
    db = get_db()
    result = db.table("semesters").select("*").order("created_at", desc=True).execute()
    return [SemesterOut(**s) for s in result.data]


@router.get("/semesters/active", response_model=SemesterOut)
def get_active_semester(user=Depends(get_current_user)):
    db = get_db()
    result = db.table("semesters").select("*").eq("is_active", True).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No active semester found")
    return SemesterOut(**result.data[0])


@router.post("/semesters", response_model=SemesterOut)
def create_semester(data: SemesterCreate, user=Depends(require_admin)):
    db = get_db()

    semester = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "is_active": False,
        "window_open_at": data.window_open_at,
        "window_close_at": data.window_close_at,
        "created_by": user["id"],
    }

    result = db.table("semesters").insert(semester).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "CREATE_SEMESTER",
        "target_type": "semester",
        "target_id": semester["id"],
        "detail": {"name": data.name}
    }).execute()

    return SemesterOut(**result.data[0])


@router.patch("/semesters/{semester_id}/activate")
def activate_semester(semester_id: str, user=Depends(require_admin)):
    db = get_db()

    # Deactivate all semesters first
    all_semesters = db.table("semesters").select("id").execute()
    for s in all_semesters.data:
        db.table("semesters").update({"is_active": False}).eq("id", s["id"]).execute()
  

    # Activate this one
    db.table("semesters").update({"is_active": True}).eq("id", semester_id).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "ACTIVATE_SEMESTER",
        "target_type": "semester",
        "target_id": semester_id,
        "detail": {}
    }).execute()

    return {"message": "Semester activated"}


@router.patch("/semesters/{semester_id}/window")
def toggle_registration_window(
    semester_id: str,
    action: str,
    user=Depends(require_admin)
):
    """action: 'open' or 'close'"""
    from datetime import datetime, timezone
    db = get_db()

    if action == "open":
        db.table("semesters").update({
            "window_open_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", semester_id).execute()
        msg = "Registration window opened"
    elif action == "close":
        db.table("semesters").update({
            "window_close_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", semester_id).execute()
        # Lock all submitted registrations
        db.table("registrations").update(
            {"status": "locked"}
        ).eq("semester_id", semester_id).eq("status", "submitted").execute()
        msg = "Registration window closed and registrations locked"
    else:
        raise HTTPException(status_code=400, detail="action must be 'open' or 'close'")

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": f"WINDOW_{action.upper()}",
        "target_type": "semester",
        "target_id": semester_id,
        "detail": {"action": action}
    }).execute()

    return {"message": msg}


@router.post("/semesters/{semester_id}/courses")
def activate_courses_for_semester(
    semester_id: str,
    data: ActivateCourseRequest,
    user=Depends(require_admin)
):
    db = get_db()

    records = [{
        "id": str(uuid.uuid4()),
        "semester_id": semester_id,
        "course_id": course_id,
        "activated_by": user["id"],
    } for course_id in data.course_ids]

    # Insert in batches
    for i in range(0, len(records), 50):
        batch = records[i:i+50]
        db.table("semester_courses").upsert(
            batch,
            on_conflict="semester_id,course_id"
        ).execute()

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "ACTIVATE_COURSES",
        "target_type": "semester",
        "target_id": semester_id,
        "detail": {"count": len(data.course_ids)}
    }).execute()

    return {"message": f"{len(data.course_ids)} courses activated for semester"}


@router.delete("/semesters/{semester_id}/courses/{course_id}")
def deactivate_course(
    semester_id: str,
    course_id: str,
    user=Depends(require_admin)
):
    db = get_db()
    db.table("semester_courses").delete().eq(
        "semester_id", semester_id
    ).eq("course_id", course_id).execute()
    return {"message": "Course deactivated"}