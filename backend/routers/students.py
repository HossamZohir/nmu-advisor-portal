from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from core.dependencies import get_current_user, require_admin
from schemas.student import StudentOut, StudentUpdate, ImportResult
from database import get_db
import pandas as pd
import uuid
import io

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/", response_model=list[StudentOut])
def get_students(user=Depends(get_current_user)):
    db = get_db()

    query = db.table("students").select(
        "*, programs(name_en), users(name_en, name_ar)"
    )

    # Advisors only see their own students
    if user["role"] == "advisor":
        query = query.eq("advisor_id", user["id"])
    # Dept admin sees students in their department
    elif user["role"] == "dept_admin":
        # Get programs in this department
        programs = db.table("programs").select("id").eq(
            "department_id", user["department_id"]
        ).execute()
        program_ids = [p["id"] for p in programs.data]
        query = query.in_("program_id", program_ids)
    # Dean sees all

    result = query.execute()

    students = []
    for s in result.data:
        program_name = s.get("programs", {})
        program_name = program_name.get("name_en") if program_name else None
        advisor = s.get("users", {})
        advisor_name = advisor.get("name_en") if advisor else None

        students.append(StudentOut(
            id=s["id"],
            student_id=s["student_id"],
            name_ar=s["name_ar"],
            name_en=s["name_en"],
            program_id=s["program_id"],
            program_name=program_name,
            advisor_id=s.get("advisor_id"),
            advisor_name=advisor_name,
            current_level=s["current_level"],
            gpa=float(s["gpa"] or 0),
            passed_courses=s.get("passed_courses") or [],
            failed_courses=s.get("failed_courses") or [],
        ))

    return students


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: str, user=Depends(get_current_user)):
    db = get_db()

    result = db.table("students").select(
        "*, programs(name_en), users(name_en, name_ar)"
    ).eq("id", student_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")

    s = result.data[0]

    # Advisors can only view their own students
    if user["role"] == "advisor" and s.get("advisor_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    program_name = s.get("programs", {})
    program_name = program_name.get("name_en") if program_name else None
    advisor = s.get("users", {})
    advisor_name = advisor.get("name_en") if advisor else None

    return StudentOut(
        id=s["id"],
        student_id=s["student_id"],
        name_ar=s["name_ar"],
        name_en=s["name_en"],
        program_id=s["program_id"],
        program_name=program_name,
        advisor_id=s.get("advisor_id"),
        advisor_name=advisor_name,
        current_level=s["current_level"],
        gpa=float(s["gpa"] or 0),
        passed_courses=s.get("passed_courses") or [],
        failed_courses=s.get("failed_courses") or [],
    )


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: str,
    data: StudentUpdate,
    user=Depends(require_admin)
):
    db = get_db()

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    db.table("students").update(update_data).eq("id", student_id).execute()

    # Log action
    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "UPDATE_STUDENT",
        "target_type": "student",
        "target_id": student_id,
        "detail": update_data
    }).execute()

    return get_student(student_id, user)


@router.post("/import", response_model=ImportResult)
def import_students(
    file: UploadFile = File(...),
    user=Depends(require_admin)
):
    db = get_db()

    contents = file.file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    required_cols = ["student_id", "name_ar", "name_en", "program", "current_level", "gpa"]
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Missing columns: {', '.join(missing_cols)}"
        )

    # Get all programs
    programs_result = db.table("programs").select("id, name_en").execute()
    program_map = {p["name_en"].strip(): p["id"] for p in programs_result.data}

    # Get all advisors by email
    advisors_result = db.table("users").select("id, email, name_en").eq("role", "advisor").execute()
    advisor_map = {a["email"].strip().lower(): a["id"] for a in advisors_result.data}

    inserted = 0
    updated = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            student_id = str(row["student_id"]).strip()
            name_ar = str(row["name_ar"]).strip()
            name_en = str(row["name_en"]).strip()
            program_name = str(row["program"]).strip()
            current_level = int(row["current_level"])
            gpa = float(row["gpa"])

            if program_name not in program_map:
                errors.append(f"Row {idx+2}: Program not found: {program_name}")
                skipped += 1
                continue

            program_id = program_map[program_name]

            # Parse advisor email
            advisor_id = None
            if "advisor_email" in df.columns and pd.notna(row.get("advisor_email")):
                advisor_email = str(row["advisor_email"]).strip().lower()
                if advisor_email and advisor_email in advisor_map:
                    advisor_id = advisor_map[advisor_email]
                elif advisor_email:
                    errors.append(f"Row {idx+2}: Advisor email not found: {advisor_email}")

            # Parse passed/failed courses
            passed = []
            failed = []
            if "passed_courses" in df.columns and pd.notna(row.get("passed_courses")):
                passed = [c.strip() for c in str(row["passed_courses"]).split(",") if c.strip()]
            if "failed_courses" in df.columns and pd.notna(row.get("failed_courses")):
                failed = [c.strip() for c in str(row["failed_courses"]).split(",") if c.strip()]

            student_data = {
                "student_id": student_id,
                "name_ar": name_ar,
                "name_en": name_en,
                "program_id": program_id,
                "current_level": current_level,
                "gpa": gpa,
                "passed_courses": passed,
                "failed_courses": failed,
            }

            if advisor_id:
                student_data["advisor_id"] = advisor_id

            existing = db.table("students").select("id").eq("student_id", student_id).execute()

            if existing.data:
                db.table("students").update(student_data).eq("student_id", student_id).execute()
                updated += 1
            else:
                student_data["id"] = str(uuid.uuid4())
                db.table("students").insert(student_data).execute()
                inserted += 1

        except Exception as e:
            errors.append(f"Row {idx+2}: {str(e)}")
            skipped += 1

    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "IMPORT_STUDENTS",
        "target_type": "students",
        "target_id": None,
        "detail": {"inserted": inserted, "updated": updated, "skipped": skipped}
    }).execute()

    return ImportResult(
        total=len(df),
        inserted=inserted,
        updated=updated,
        skipped=skipped,
        errors=errors[:20]
    )
    