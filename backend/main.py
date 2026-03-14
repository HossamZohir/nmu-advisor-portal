from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import auth, students, courses, registration, reports, users, departments, exports, programs

load_dotenv()

app = FastAPI(
    title="NMU Advisor Portal API",
    description="Academic Advisor Course Registration System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://nmu-advisor-portal.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(registration.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(exports.router)
app.include_router(programs.router)

@app.get("/")
def root():
    return {"message": "NMU Advisor Portal API is running ✅"}