"""Case Notes: private notes per lawyer per case."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import get_collection
from deps import require_verified_lawyer

router = APIRouter(prefix="/notes", tags=["notes"])


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _out(doc):
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


@router.get("")
def list_notes(caseId: str | None = None, user=Depends(require_verified_lawyer)):
    coll = get_collection("case_notes")
    q = {"lawyerId": user["id"]}
    if caseId:
        q["caseId"] = caseId
    cursor = coll.find(q).sort("updatedAt", -1)
    return [_out(d) for d in cursor]


@router.post("")
def create_note(payload: dict, user=Depends(require_verified_lawyer)):
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    coll = get_collection("case_notes")
    doc = {
        "lawyerId": user["id"],
        "caseId": payload.get("caseId"),
        "title": title,
        "body": payload.get("body") or "",
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    r = coll.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    return doc


@router.patch("/{note_id}")
def update_note(note_id: str, payload: dict, user=Depends(require_verified_lawyer)):
    coll = get_collection("case_notes")
    try:
        oid = ObjectId(note_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Note not found")
    doc = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    update = {}
    for k in ["title", "body"]:
        if k in payload:
            update[k] = payload.get(k) or ""
    if "title" in update and not (update["title"] or "").strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not update:
        return {"ok": True}
    update["updatedAt"] = _now()
    coll.update_one({"_id": oid}, {"$set": update})
    doc = coll.find_one({"_id": oid})
    return _out(doc)


@router.delete("/{note_id}")
def delete_note(note_id: str, user=Depends(require_verified_lawyer)):
    coll = get_collection("case_notes")
    try:
        oid = ObjectId(note_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Note not found")
    coll.delete_one({"_id": oid, "lawyerId": user["id"]})
    return {"ok": True}

