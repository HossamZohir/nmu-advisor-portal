import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import os
import uuid
import bcrypt

load_dotenv()

# Connect to Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SECRET_KEY")
supabase = create_client(url, key)

print("✅ Connected to Supabase")

batch_size = 50

# =============================================
# 1. INSERT DEPARTMENTS
# =============================================
dept_id = str(uuid.uuid4())
supabase.table("departments").upsert({
    "id": dept_id,
    "name_en": "Engineering",
    "name_ar": "كلية الهندسة"
}).execute()

result = supabase.table("departments").select("id").eq("name_en", "Engineering").execute()
dept_id = result.data[0]["id"]
print("✅ Departments inserted")

# =============================================
# 2. INSERT PROGRAMS
# =============================================
programs_data = [
    {"name_en": "Media Engineering & Technology Program",
     "name_ar": "برنامج هندسة وسائل الإعلام والتكنولوجيا"},
    {"name_en": "Engineering & Technology Implementation of Civil Works Program",
     "name_ar": "برنامج هندسة وتكنولوجيا تنفيذ الأعمال المدنية"},
    {"name_en": "Product Development Engineering Program",
     "name_ar": "برنامج هندسة تطوير المنتج"},
    {"name_en": "Aeronautical & Aerospace Engineering Program",
     "name_ar": "برنامج هندسة الطيران والفضاء"},
    {"name_en": "Petroleum & Gas Engineering Program",
     "name_ar": "برنامج هندسة البترول والغاز"},
    {"name_en": "Environmental Architecture & Technology Program",
     "name_ar": "برنامج العمارة البيئية وتكنولوجيا البناء"},
    {"name_en": "Mechatronics Engineering Program",
     "name_ar": "برنامج هندسة الميكاترونيكس"},
    {"name_en": "Energy Engineering Program",
     "name_ar": "برنامج هندسة الطاقة"},
    {"name_en": "Biomedical Engineering Program",
     "name_ar": "برنامج الهندسة الطبية الحيوية"},
]

program_ids = {}
for prog in programs_data:
    prog["id"] = str(uuid.uuid4())
    prog["department_id"] = dept_id
    supabase.table("programs").upsert(prog, on_conflict="name_en").execute()

all_programs = supabase.table("programs").select("id, name_en").execute()
program_ids = {p["name_en"]: p["id"] for p in all_programs.data}
print(f"✅ {len(programs_data)} Programs inserted")

# =============================================
# 3. INSERT COURSES
# =============================================
courses_df = pd.read_excel("extracted_courses_revised_vol_3.xlsx")

course_ids = {}
courses_to_insert = []

for _, row in courses_df.iterrows():
    course = {
        "id": str(uuid.uuid4()),
        "code": str(row["Course Code"]).strip(),
        "name_en": str(row["Course Name"]).strip(),
        "credit_hours": int(row["Credit Hours"]),
        "lct": int(row["LCT"]) if pd.notna(row["LCT"]) else 0,
        "tut": int(row["TUT"]) if pd.notna(row["TUT"]) else 0,
        "lab": int(row["LAB"]) if pd.notna(row["LAB"]) else 0,
        "oth": int(row["OTH"]) if pd.notna(row["OTH"]) else 0,
        "swl": int(row["SWL"]) if pd.notna(row["SWL"]) else 0,
        "ects": int(row["ECTS"]) if pd.notna(row["ECTS"]) else 0,
    }
    courses_to_insert.append(course)

for i in range(0, len(courses_to_insert), batch_size):
    batch = courses_to_insert[i:i + batch_size]
    supabase.table("courses").upsert(batch, on_conflict="code").execute()

all_courses = supabase.table("courses").select("id, code").execute()
course_ids = {c["code"]: c["id"] for c in all_courses.data}
print(f"✅ {len(course_ids)} Courses loaded (including shared courses)")

# =============================================
# 4. INSERT PREREQUISITES
# =============================================
prereqs_to_insert = []
prereq_warnings = []

for _, row in courses_df.iterrows():
    prereq_raw = str(row["Prerequisite"]).strip()
    if prereq_raw == "---" or prereq_raw == "nan":
        continue

    course_code = str(row["Course Code"]).strip()
    if course_code not in course_ids:
        continue

    prereqs = [p.strip() for p in prereq_raw.split(",")]
    for prereq_code in prereqs:
        if prereq_code in course_ids:
            prereqs_to_insert.append({
                "id": str(uuid.uuid4()),
                "course_id": course_ids[course_code],
                "prerequisite_course_id": course_ids[prereq_code],
            })
        else:
            prereq_warnings.append(f"  ⚠️  Prerequisite not found: {prereq_code} for {course_code}")

# Deduplicate
seen_prereqs = set()
deduped_prereqs = []
for p in prereqs_to_insert:
    key = (p["course_id"], p["prerequisite_course_id"])
    if key not in seen_prereqs:
        seen_prereqs.add(key)
        deduped_prereqs.append(p)

for i in range(0, len(deduped_prereqs), batch_size):
    batch = deduped_prereqs[i:i + batch_size]
    supabase.table("prerequisites").upsert(
        batch,
        on_conflict="course_id,prerequisite_course_id"
    ).execute()

for w in prereq_warnings:
    print(w)
print(f"✅ {len(deduped_prereqs)} Prerequisites inserted")

# =============================================
# 5. INSERT PROGRAM COURSES (Study Plan)
# =============================================
plan_df = pd.read_excel("NMU_Programs_Courses_revised.xlsx", header=1)
plan_df.columns = ["Program", "Semester", "Course Code", "Course Name", "Col5", "Col6"]
plan_df = plan_df[["Program", "Semester", "Course Code"]].dropna(subset=["Course Code"])

program_courses_to_insert = []
skipped = []

for _, row in plan_df.iterrows():
    prog_name = str(row["Program"]).strip()
    course_code = str(row["Course Code"]).strip()
    semester = int(row["Semester"])

    if prog_name not in program_ids:
        skipped.append(f"Program not found: {prog_name}")
        continue

    if course_code not in course_ids:
        skipped.append(f"Course not found: {course_code}")
        continue

    program_courses_to_insert.append({
        "id": str(uuid.uuid4()),
        "program_id": program_ids[prog_name],
        "course_id": course_ids[course_code],
        "semester_level": semester,
    })

# Deduplicate
seen_pc = set()
deduped_pc = []
for pc in program_courses_to_insert:
    key = (pc["program_id"], pc["course_id"])
    if key not in seen_pc:
        seen_pc.add(key)
        deduped_pc.append(pc)

for i in range(0, len(deduped_pc), batch_size):
    batch = deduped_pc[i:i + batch_size]
    supabase.table("program_courses").upsert(
        batch,
        on_conflict="program_id,course_id"
    ).execute()

print(f"✅ {len(deduped_pc)} Program-Course mappings inserted")

if skipped:
    print(f"  ⚠️  Skipped {len(skipped)} entries:")
    for s in skipped[:5]:
        print(f"     {s}")

# =============================================
# 6. INSERT DEFAULT ADMIN USER
# =============================================
default_password = "admin123"
hashed = bcrypt.hashpw(default_password.encode(), bcrypt.gensalt()).decode()

admin_user = {
    "id": str(uuid.uuid4()),
    "name_en": "System Admin",
    "name_ar": "مدير النظام",
    "email": "admin@nmu.edu.eg",
    "hashed_password": hashed,
    "role": "dean",
    "department_id": dept_id,
}

supabase.table("users").upsert(admin_user, on_conflict="email").execute()
print("✅ Default admin user created")
print("   Email: admin@nmu.edu.eg")
print("   Password: admin123")

print("\n🎉 Database seeding complete!")