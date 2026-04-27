"""Clients: CRUD for a lawyer's client list."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import get_collection
from deps import require_verified_lawyer

router = APIRouter(prefix="/clients", tags=["clients"])


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _out(doc):
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


@router.get("")
def list_clients(user=Depends(require_verified_lawyer)):
    coll = get_collection("clients")
    cursor = coll.find({"lawyerId": user["id"]}).sort("createdAt", -1)
    return [_out(d) for d in cursor]


@router.post("")
def create_client(payload: dict, user=Depends(require_verified_lawyer)):
    # Minimal validation (frontend can enforce form fields); keep API flexible.
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name is required")
    coll = get_collection("clients")
    doc = {
        "lawyerId": user["id"],
        "name": name,
        "email": (payload.get("email") or "").strip() or None,
        "phone": (payload.get("phone") or "").strip() or None,
        "address": (payload.get("address") or "").strip() or None,
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    r = coll.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    return doc


@router.get("/{client_id}")
def get_client(client_id: str, user=Depends(require_verified_lawyer)):
    coll = get_collection("clients")
    try:
        oid = ObjectId(client_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Client not found")
    doc = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found")
    return _out(doc)


@router.patch("/{client_id}")
def update_client(client_id: str, payload: dict, user=Depends(require_verified_lawyer)):
    coll = get_collection("clients")
    try:
        oid = ObjectId(client_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Client not found")
    doc = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found")
    update = {}
    for k in ["name", "email", "phone", "address"]:
        if k in payload:
            v = payload.get(k)
            update[k] = (v.strip() if isinstance(v, str) else v) or None
    if "name" in update and not (update["name"] or "").strip():
        raise HTTPException(status_code=400, detail="Client name is required")
    if not update:
        return {"ok": True}
    update["updatedAt"] = _now()
    coll.update_one({"_id": oid}, {"$set": update})
    doc = coll.find_one({"_id": oid})
    return _out(doc)


@router.delete("/{client_id}")
def delete_client(client_id: str, user=Depends(require_verified_lawyer)):
    coll = get_collection("clients")
    try:
        oid = ObjectId(client_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Client not found")
    coll.delete_one({"_id": oid, "lawyerId": user["id"]})
    return {"ok": True}

