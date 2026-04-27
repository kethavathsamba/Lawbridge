"""FastAPI dependencies: current user from JWT."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from database import get_collection
from auth_utils import decode_token

security = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return payload["sub"]


def get_current_user(
    user_id: str = Depends(get_current_user_id),
):
    users = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = str(user["_id"])
    if user.get("_id"):
        del user["_id"]
    if user.get("passwordHash"):
        del user["passwordHash"]
    return user


def require_role(role: str):
    def _dep(user=Depends(get_current_user)):
        if user.get("role") != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _dep


def require_verified_lawyer(user=Depends(get_current_user)):
    if user.get("role") != "lawyer":
        raise HTTPException(status_code=403, detail="Forbidden")
    lawyers = get_collection("lawyers")
    profile = lawyers.find_one({"userId": user["id"], "verified": True})
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lawyer account pending admin approval",
        )
    return user
