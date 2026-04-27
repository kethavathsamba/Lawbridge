"""Auth: register, login, me, forgot-password."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from database import get_collection
from pymongo.errors import PyMongoError
from bson import ObjectId
from auth_utils import hash_password, verify_password, create_access_token
from models import RegisterBody, LoginBody, ForgotPasswordBody
from deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(body: RegisterBody):
    try:
        users = get_collection("users")
        lawyers = get_collection("lawyers")
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable. Check MongoDB connection.")
    if users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    role = "lawyer" if body.userType == "lawyer" else "client"
    doc = {
        "email": body.email.lower(),
        "passwordHash": hash_password(body.password),
        "name": body.fullName,
        "phone": body.phone,
        "address": body.address or None,
        "role": role,
        "profilePic": None,
    }
    r = users.insert_one(doc)
    user_id = str(r.inserted_id)
    if role == "lawyer":
        if not body.barCouncilId:
            raise HTTPException(status_code=400, detail="Bar Council ID is required for lawyer registration")
        lawyers.insert_one(
            {
                "userId": user_id,
                "qualification": body.qualification or None,
                "specialization": body.specialization or None,
                "experience": body.experience or None,
                "location": body.location or None,
                "fee": None,
                "caseFee": body.caseFee or None,
                "rating": 4.5,
                "reviews": 0,
                "languages": [],
                "verified": False,
                "barCouncilId": body.barCouncilId,
                "availability": None,
                "bio": None,
                "imgColor": "#cbd5e1",
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }
        )
    token = create_access_token({"sub": user_id})
    user = {"id": user_id, "email": doc["email"], "name": doc["name"], "role": doc["role"], "phone": doc["phone"], "address": doc["address"]}
    return {"token": token, "user": user}


@router.post("/login")
def login(body: LoginBody):
    try:
        users = get_collection("users")
        user = users.find_one({"email": body.email.lower()})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable. Check MongoDB connection.")
    if not user or not verify_password(body.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user["_id"])})
    out = {"id": str(user["_id"]), "email": user["email"], "name": user["name"], "role": user["role"]}
    if user.get("phone"):
        out["phone"] = user["phone"]
    if user.get("address"):
        out["address"] = user["address"]
    return {"token": token, "user": out}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody):
    users = get_collection("users")
    u = users.find_one({"email": body.email.lower()})
    if not u:
        return {"message": "If an account exists, you will receive a reset link."}
    return {"message": "If an account exists, you will receive a reset link."}


@router.post("/update-wallet")
def update_wallet(body: dict, user=Depends(get_current_user)):
    """Update user's blockchain wallet address"""
    try:
        users = get_collection("users")
        wallet_address = body.get("walletAddress", "").strip()
        
        if not wallet_address:
            raise HTTPException(status_code=400, detail="Wallet address is required")
        
        # Basic validation: Ethereum addresses are 42 characters starting with 0x
        if not wallet_address.startswith("0x") or len(wallet_address) != 42:
            raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
        # Update user with wallet address
        result = users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"walletAddress": wallet_address.lower()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update wallet")
        
        return {
            "success": True,
            "message": "Wallet address updated successfully",
            "walletAddress": wallet_address.lower()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating wallet: {str(e)}")
