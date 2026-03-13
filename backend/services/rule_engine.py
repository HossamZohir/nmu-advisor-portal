from database import get_db

def check_registration_rules(student: dict, course_id: str, current_course_ids: list) -> dict:
    """
    Returns {"allowed": True/False, "reason": "..."}
    """
    db = get_db()

    # Get course details
    course_result = db.table("courses").select("*").eq("id", course_id).execute()
    if not course_result.data:
        return {"allowed": False, "reason": "Course not found"}

    course = course_result.data[0]
    course_code = course["code"]

    # 1. Check course belongs to student's program
    program_check = db.table("program_courses").select("id").eq(
        "program_id", student["program_id"]
    ).eq("course_id", course_id).execute()

    if not program_check.data:
        return {
            "allowed": False,
            "reason": f"{course_code} is not part of the student's program curriculum"
        }

    # 2. Already passed this course?
    passed_courses = student.get("passed_courses") or []
    if course_code in passed_courses:
        return {"allowed": False, "reason": f"Already passed {course_code}"}

    # 3. Already in current registration?
    if course_id in current_course_ids:
        return {"allowed": False, "reason": f"{course_code} already added"}

    # 4. Check prerequisites
    prereq_result = db.table("prerequisites").select(
        "courses!prerequisites_prerequisite_course_id_fkey(code)"
    ).eq("course_id", course_id).execute()

    for p in prereq_result.data:
        prereq_code = p.get("courses", {}).get("code", "")
        if prereq_code and prereq_code not in passed_courses:
            return {
                "allowed": False,
                "reason": f"Prerequisite not met: {prereq_code} must be passed first"
            }

    # 5. Check credit hour cap
    gpa = float(student.get("gpa") or 0)
    max_credits = 14 if gpa < 2.0 else 18

    # Get current total credit hours
    current_credits = 0
    if current_course_ids:
        credits_result = db.table("courses").select("credit_hours").in_(
            "id", current_course_ids
        ).execute()
        current_credits = sum(c["credit_hours"] for c in credits_result.data)

    new_total = current_credits + course["credit_hours"]
    if new_total > max_credits:
        return {
            "allowed": False,
            "reason": f"Credit hour limit exceeded. Max: {max_credits}, Current: {current_credits}, Adding: {course['credit_hours']}"
        }

    return {"allowed": True, "reason": "OK"}