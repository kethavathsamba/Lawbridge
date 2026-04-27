"""Notifications: list and mark-read."""

from datetime import datetime
from fastapi import APIRouter, Depends
from bson import ObjectId

from database import get_collection
from deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _out(doc):
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


@router.get("")
def list_notifications(user=Depends(get_current_user)):
    coll = get_collection("notifications")
    cursor = coll.find({"userId": user["id"]}).sort("createdAt", -1).limit(100)
    return [_out(d) for d in cursor]


@router.post("/mark-read")
def mark_all_read(user=Depends(get_current_user)):
    coll = get_collection("notifications")
    coll.update_many({"userId": user["id"], "readAt": None}, {"$set": {"readAt": _now()}})
    return {"ok": True}


@router.post("/{notif_id}/read")
def mark_one_read(notif_id: str, user=Depends(get_current_user)):
    coll = get_collection("notifications")
    try:
        oid = ObjectId(notif_id)
    except Exception:
        return {"ok": True}
    coll.update_one({"_id": oid, "userId": user["id"]}, {"$set": {"readAt": _now()}})
    return {"ok": True}

