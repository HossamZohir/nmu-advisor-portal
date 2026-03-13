from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_db
from core.security import verify_password, create_access_token, decode_access_token
from schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    db = get_db()

    # Find user by email
    result = db.table("users").select("*").eq(
        "email", request.email
    ).eq("is_active", True).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]

    # Verify password
    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create token
    token = create_access_token({
        "sub": user["id"],
        "role": user["role"],
        "department_id": user.get("department_id")
    })

    # Log the action
    db.table("audit_log").insert({
        "user_id": user["id"],
        "action": "LOGIN",
        "target_type": "user",
        "target_id": user["id"],
        "detail": {"email": user["email"]}
    }).execute()

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        name_ar=user["name_ar"],
        name_en=user["name_en"],
        role=user["role"],
        department_id=user.get("department_id")
    )

@router.get("/me", response_model=UserOut)
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = get_db()
    result = db.table("users").select("*").eq("id", payload["sub"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    return UserOut(**user)