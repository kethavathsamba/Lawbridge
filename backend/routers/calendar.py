"""Calendar events for lawyers (hearings, meetings, deadlines)."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import get_collection
from deps import require_verified_lawyer

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _out(doc):
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


@router.get("")
def list_events(user=Depends(require_verified_lawyer)):
    coll = get_collection("calendar_events")
    cursor = coll.find({"lawyerId": user["id"]}).sort("startAt", 1)
    return [_out(d) for d in cursor]


@router.post("")
def create_event(payload: dict, user=Depends(require_verified_lawyer)):
    title = (payload.get("title") or "").strip()
    startAt = payload.get("startAt")
    if not title or not startAt:
        raise HTTPException(status_code=400, detail="title and startAt are required")
    coll = get_collection("calendar_events")
    doc = {
        "lawyerId": user["id"],
        "caseId": payload.get("caseId"),
        "kind": payload.get("kind") or "meeting",
        "title": title,
        "startAt": startAt,
        "endAt": payload.get("endAt"),
        "reminderAt": payload.get("reminderAt"),
        "notes": payload.get("notes") or "",
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    r = coll.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    return doc


@router.patch("/{event_id}")
def update_event(event_id: str, payload: dict, user=Depends(require_verified_lawyer)):
    coll = get_collection("calendar_events")
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Event not found")
    doc = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    update = {}
    for k in ["caseId", "kind", "title", "startAt", "endAt", "reminderAt", "notes"]:
        if k in payload:
            update[k] = payload.get(k)
    if "title" in update and not (update["title"] or "").strip():
        raise HTTPException(status_code=400, detail="title is required")
    if "startAt" in update and not update["startAt"]:
        raise HTTPException(status_code=400, detail="startAt is required")
    if not update:
        return {"ok": True}
    update["updatedAt"] = _now()
    coll.update_one({"_id": oid}, {"$set": update})
    doc = coll.find_one({"_id": oid})
    return _out(doc)


@router.delete("/{event_id}")
def delete_event(event_id: str, user=Depends(require_verified_lawyer)):
    coll = get_collection("calendar_events")
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Event not found")
    coll.delete_one({"_id": oid, "lawyerId": user["id"]})
    return {"ok": True}

