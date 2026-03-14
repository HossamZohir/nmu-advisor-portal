from fastapi import APIRouter, Depends
from core.dependencies import get_current_user, require_admin
from database import get_db

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/advisor-stats")
def get_advisor_stats(user=Depends(require_admin)):
    db = get_db()

    # Get all advisors
    advisors = db.table("users").select("id, name_en, name_ar").eq("role", "advisor").execute()

    # Get active semester
    sem = db.table("semesters").select("id").eq("is_active", True).execute()
    semester_id = sem.data[0]["id"] if sem.data else None

    stats = []
    total_students = 0
    total_registered = 0
    total_sis = 0
    total_paid = 0

    for advisor in advisors.data:
        # Get students for this advisor
        students = db.table("students").select("id").eq("advisor_id", advisor["id"]).execute()
        student_ids = [s["id"] for s in students.data]
        count = len(student_ids)
        total_students += count

        registered = 0
        sis = 0
        paid = 0

        if semester_id and student_ids:
            regs = db.table("registrations").select(
                "student_id, status, sis_checked, payment_checked"
            ).eq("semester_id", semester_id).in_("student_id", student_ids).execute()

            for r in regs.data:
                if r["status"] in ["submitted", "locked"]:
                    registered += 1
                if r["sis_checked"]:
                    sis += 1
                if r["payment_checked"]:
                    paid += 1

        total_registered += registered
        total_sis += sis
        total_paid += paid

        stats.append({
            "advisor_id": advisor["id"],
            "advisor_name": advisor["name_en"],
            "total": count,
            "registered": registered,
            "sis": sis,
            "paid": paid,
        })

    return {
        "summary": {
            "total_students": total_students,
            "total_registered": total_registered,
            "total_sis": total_sis,
            "total_paid": total_paid,
        },
        "advisors": stats
    }


@router.get("/students-table")
def get_students_table(user=Depends(require_admin)):
    db = get_db()

    # Get active semester
    sem = db.table("semesters").select("id, name").eq("is_active", True).execute()
    semester_id = sem.data[0]["id"] if sem.data else None

    # Get all students with program and advisor
    students = db.table("students").select(
        "id, student_id, name_en, name_ar, gpa, current_level, program_id, advisor_id, programs(name_en), users(name_en)"
    ).execute()

    result = []
    for s in students.data:
        reg = None
        if semester_id:
            reg_res = db.table("registrations").select(
                "status, sis_checked, payment_checked, total_credit_hours"
            ).eq("student_id", s["id"]).eq("semester_id", semester_id).execute()
            if reg_res.data:
                reg = reg_res.data[0]

            # Get registered course codes
            if reg:
                rc = db.table("registration_courses").select(
                    "courses(code, name_en)"
                ).eq("registration_id", db.table("registrations").select("id").eq(
                    "student_id", s["id"]
                ).eq("semester_id", semester_id).execute().data[0]["id"] if reg else "none").execute()
                reg["courses"] = [r.get("courses", {}) for r in rc.data if r.get("courses")]

        result.append({
            "id": s["id"],
            "student_id": s["student_id"],
            "name_en": s["name_en"],
            "name_ar": s["name_ar"],
            "gpa": s["gpa"],
            "current_level": s["current_level"],
            "program": s.get("programs", {}).get("name_en", "") if s.get("programs") else "",
            "advisor": s.get("users", {}).get("name_en", "Unassigned") if s.get("users") else "Unassigned",
            "registration": reg,
        })

    return result