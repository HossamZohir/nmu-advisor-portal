from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.security import decode_access_token
from database import get_db

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = get_db()
    result = db.table("users").select("*").eq("id", payload["sub"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return result.data[0]

def require_roles(*roles):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(roles)}"
            )
        return user
    return checker

def require_advisor(user=Depends(get_current_user)):
    if user["role"] not in ["advisor", "dept_admin", "dean"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return user

def require_admin(user=Depends(get_current_user)):
    if user["role"] not in ["dept_admin", "dean"]:
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")
    return user

def require_dean(user=Depends(get_current_user)):
    if user["role"] != "dean":
        raise HTTPException(status_code=403, detail="Access denied. Dean only.")
    return user