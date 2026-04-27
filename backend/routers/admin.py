"""Admin: users, verify lawyer, stats."""
from fastapi import APIRouter, HTTPException, Depends, Query as Q
from bson import ObjectId
from database import get_collection
from deps import get_current_user, require_role

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_out(u):
    return {
        "id": str(u["_id"]),
        "email": u.get("email"),
        "name": u.get("name"),
        "role": u.get("role"),
        "phone": u.get("phone"),
        "address": u.get("address"),
    }


@router.get("/users")
def list_users(
    role: str | None = Q(None),
    user=Depends(require_role("admin"))
):
    users = get_collection("users")
    q = {} if not role else {"role": role}
    cursor = users.find(q)
    return [_user_out(u) for u in cursor]


@router.get("/stats")
def stats(user=Depends(require_role("admin")),):
    users = get_collection("users")
    lawyers = get_collection("lawyers")
    cases = get_collection("cases")
    consultations = get_collection("consultations")
    total_users = users.count_documents({})
    verified_lawyers = lawyers.count_documents({"verified": True})
    total_lawyer_users = users.count_documents({"role": "lawyer"})
    active_cases = cases.count_documents({"status": {"$in": ["Pending", "In Progress", "Court Filed"]}})
    from datetime import datetime, timedelta
    month_ago = (datetime.utcnow() - timedelta(days=30)).isoformat() + "Z"
    consultations_month = consultations.count_documents({"createdAt": {"$gte": month_ago}})
    return {
        "totalUsers": total_users,
        "verifiedLawyers": verified_lawyers,
        "totalLawyers": total_lawyer_users,
        "activeCases": active_cases,
        "consultationsThisMonth": consultations_month,
    }


@router.post("/lawyers/{lawyer_id}/verify")
def verify_lawyer(
    lawyer_id: str,
    verified: bool = Q(True, description="Set to true to approve"),
    user=Depends(require_role("admin"))
):
    lawyers = get_collection("lawyers")
    lawyers.update_one(
        {"userId": lawyer_id},
        {"$set": {"verified": verified}},
        upsert=True,
    )
    return {"ok": True}


@router.get("/lawyers/pending")
def pending_lawyers(user=Depends(require_role("admin")),):
    lawyers = get_collection("lawyers")
    users = get_collection("users")
    out = []
    cursor = users.find({"role": "lawyer"})
    for u in cursor:
        uid = str(u["_id"])
        p = lawyers.find_one({"userId": uid}) or {}
        # Pending if profile missing OR not explicitly verified true
        if not (p.get("verified") is True):
            out.append({
                "id": uid,
                "name": u.get("name") or "",
                "email": u.get("email") or "",
                "barId": p.get("barCouncilId"),
                "submitted": p.get("createdAt"),
            })
    return out


@router.get("/cases")
def list_all_cases(user=Depends(require_role("admin")),):
    cases = get_collection("cases")
    users = get_collection("users")
    cursor = cases.find({}).sort("createdAt", -1)
    out = []
    for c in cursor:
        client = users.find_one({"_id": ObjectId(c["clientId"])}) if c.get("clientId") else None
        lawyer = users.find_one({"_id": ObjectId(c["lawyerId"])}) if c.get("lawyerId") else None
        out.append({
            "id": str(c["_id"]),
            "title": c.get("title"),
            "client": client.get("name") if client else "",
            "lawyer": lawyer.get("name") if lawyer else "",
            "status": c.get("status"),
            "filed": c.get("createdAt"),
        })
    return out


@router.delete("/lawyers/{lawyer_id}")
def delete_lawyer(
    lawyer_id: str,
    user=Depends(require_role("admin")),
):
    users = get_collection("users")
    lawyers = get_collection("lawyers")
    cases = get_collection("cases")
    consultations = get_collection("consultations")
    try:
        oid = ObjectId(lawyer_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    users.delete_one({"_id": oid, "role": "lawyer"})
    lawyers.delete_many({"userId": lawyer_id})
    cases.update_many({"lawyerId": lawyer_id}, {"$set": {"lawyerId": None}})
    consultations.delete_many({"lawyerId": lawyer_id})
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    user=Depends(require_role("admin")),
):
    """Delete a user (client or lawyer) and clean up related data.

    - Lawyer: delegate to delete_lawyer (removes user, profile, cases, consultations).
    - Client: remove user and any cases where they are the client.
    - Admin: protected from deletion via API.
    """
    users = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")

    u = users.find_one({"_id": oid})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    role = u.get("role")
    if role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin users")
    if role == "lawyer":
        # Reuse existing deletion logic.
        return delete_lawyer(user_id, user=user)

    # Assume everything else is a "client" account.
    cases = get_collection("cases")
    consultations = get_collection("consultations")

    users.delete_one({"_id": oid})
    cases.update_many({"clientId": user_id}, {"$set": {"clientId": None}})
    consultations.delete_many({"clientId": user_id})
    return {"ok": True}
