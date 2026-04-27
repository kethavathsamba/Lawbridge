"""Lawyers: list (with filters), get by id."""
import re
from fastapi import APIRouter, Query, HTTPException, Depends
from bson import ObjectId
from database import get_collection
from deps import get_current_user
from models import LawyerProfileBody

router = APIRouter(prefix="/lawyers", tags=["lawyers"])


def _parse_years(s):
    if not s:
        return 0
    m = re.search(r"(\d+)", str(s))
    return int(m.group(1)) if m else 0


def _lawyer_doc_to_response(user, profile):
    p = profile or {}
    return {
        "id": user.get("id", ""),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "spec": p.get("specialization", ""),
        "specTags": (p.get("specialization") or "").replace(" & ", " ").split() or [],
        "exp": p.get("experience", ""),
        "expYears": _parse_years(p.get("experience")),
        "rating": p.get("rating", 4.5),
        "reviews": p.get("reviews", 0),
        "loc": p.get("location", ""),
        "languages": p.get("languages") or [],
        "fee": p.get("fee", "Rs 0"),
        "caseFee": p.get("caseFee", "Rs 0"),
        "available": p.get("available", True),
        "imgColor": p.get("imgColor", "#cbd5e1"),
        "bar_id": p.get("barCouncilId"),
        "bio": p.get("bio"),
        "availability": p.get("availability"),
        "verified": p.get("verified", False),
    }


@router.get("")
def list_lawyers(
    search: str | None = Query(None),
    specialization: str | None = Query(None),
    location: str | None = Query(None),
    experience: str | None = Query(None),
    rating_min: float | None = Query(None),
    language: str | None = Query(None),
):
    users = get_collection("users")
    lawyers_coll = get_collection("lawyers")
    profiles = list(lawyers_coll.find({}))
    profile_by_user = {str(p["userId"]): p for p in profiles if p.get("userId")}
    cursor = users.find({"role": "lawyer"})
    results = []
    for u in cursor:
        uid = str(u["_id"])
        p = profile_by_user.get(uid) or {}
        # Hide unverified (or missing verification) lawyers from public listing
        if not (p.get("verified") is True):
            continue
        name = u.get("name") or ""
        spec = p.get("specialization") or ""
        loc = p.get("location") or ""
        exp_y = _parse_years(p.get("experience"))
        r = p.get("rating", 4.5)
        langs = p.get("languages") or []
        if search and search.lower() not in (name + " " + spec).lower():
            continue
        if specialization and specialization.lower() not in (spec or "").lower():
            continue
        if location and (loc or "").lower().find(location.lower()) < 0:
            continue
        if language and language not in langs:
            continue
        if rating_min is not None and r < rating_min:
            continue
        if experience and experience != "Any":
            if "20+" in experience and exp_y < 20:
                continue
            if "10-20" in experience and (exp_y < 10 or exp_y > 20):
                continue
            if "5-10" in experience and (exp_y < 5 or exp_y > 10):
                continue
            if "1-5" in experience and (exp_y < 1 or exp_y > 5):
                continue
        results.append(_lawyer_doc_to_response({"id": uid, **u}, p))
    return results


@router.get("/me")
def my_lawyer_profile(user=Depends(get_current_user)):
    if user.get("role") != "lawyer":
        raise HTTPException(status_code=403, detail="Forbidden")
    lawyers = get_collection("lawyers")
    profile = lawyers.find_one({"userId": user["id"]}) or {}
    out = _lawyer_doc_to_response({"id": user["id"], **user}, profile)
    # extra fields for settings (only for the logged-in lawyer)
    out["phone"] = user.get("phone")
    out["address"] = user.get("address")
    out["qualification"] = profile.get("qualification")
    out["barCouncilId"] = profile.get("barCouncilId")
    out["specialization"] = profile.get("specialization")
    out["experience"] = profile.get("experience")
    out["location"] = profile.get("location")
    out["fee"] = profile.get("fee")
    out["caseFee"] = profile.get("caseFee")
    out["available"] = profile.get("available", True)
    out["imgColor"] = profile.get("imgColor", "#cbd5e1")
    out["bio"] = profile.get("bio")
    out["availability"] = profile.get("availability")
    out["languages"] = profile.get("languages") or []
    return out


@router.get("/{lawyer_id}")
def get_lawyer(lawyer_id: str):
    lawyers = get_collection("lawyers")
    users = get_collection("users")
    try:
        oid = ObjectId(lawyer_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    user = users.find_one({"_id": oid, "role": "lawyer"})
    if not user:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    profile = lawyers.find_one({"userId": lawyer_id})
    return _lawyer_doc_to_response({"id": lawyer_id, **user}, profile or {})


@router.patch("/me")
def update_my_profile(body: LawyerProfileBody, user=Depends(get_current_user)):
    if user.get("role") != "lawyer":
        raise HTTPException(status_code=403, detail="Forbidden")
    users = get_collection("users")
    lawyers = get_collection("lawyers")
    uid = user["id"]
    data = body.model_dump(exclude_none=True)
    if not data:
        return {"ok": True}

    user_updates = {}
    for k in ("name", "phone", "address"):
        if k in data:
            user_updates[k] = data.pop(k)
    if user_updates:
        users.update_one({"_id": ObjectId(uid)}, {"$set": user_updates})

    if not data:
        return {"ok": True}
    lawyers.update_one(
        {"userId": uid},
        {"$set": data},
        upsert=True,
    )
    return {"ok": True}
