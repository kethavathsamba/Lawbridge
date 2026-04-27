"""Consultations: list, book, respond."""
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import get_collection
from deps import get_current_user, require_verified_lawyer
from models import BookConsultationBody, ConsultRespondBody, ConsultUpdateBody, ConsultStatus

router = APIRouter(prefix="/consultations", tags=["consultations"])


def _consult_to_response(c, users_coll):
    out = dict(c)
    out["id"] = str(out.get("_id", ""))
    if "_id" in out:
        del out["_id"]
    client = None
    if out.get("clientId"):
        try:
            client = users_coll.find_one({"_id": ObjectId(out["clientId"])})
        except Exception:
            client = None

    lawyer = None
    if out.get("lawyerId"):
        try:
            lawyer = users_coll.find_one({"_id": ObjectId(out["lawyerId"])})
        except Exception:
            lawyer = None
    if client:
        out["clientName"] = client.get("name", "")
    if lawyer:
        out["lawyerName"] = lawyer.get("name", "")
    return out


@router.get("")
def list_consultations(user=Depends(get_current_user)):
    coll = get_collection("consultations")
    users = get_collection("users")
    uid = user["id"]
    role = user.get("role")
    if role == "client":
        q = {"clientId": uid}
    elif role == "lawyer":
        require_verified_lawyer(user)
        q = {"lawyerId": uid}
    else:
        q = {}
    cursor = coll.find(q).sort("createdAt", -1)
    return [_consult_to_response(d, users) for d in cursor]


@router.post("")
def book_consultation(body: BookConsultationBody, user=Depends(get_current_user)):
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can book")
    ct = (body.consultType or "").lower()
    if ct != "inperson":
        raise HTTPException(status_code=400, detail="Only in-person consultations are supported")
    coll = get_collection("consultations")
    doc = {
        "clientId": user["id"],
        "lawyerId": body.lawyerId,
        "consultType": body.consultType,
        "date": body.date,
        "time": body.time,
        "caseDescription": body.caseDescription or "",
        "status": "pending",
        "lawyerNote": "",
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }
    r = coll.insert_one(doc)
    doc["_id"] = r.inserted_id
    users = get_collection("users")
    return _consult_to_response(doc, users)


@router.post("/{consult_id}/respond")
def respond_to_consultation(consult_id: str, body: ConsultRespondBody, user=Depends(require_verified_lawyer)):
    coll = get_collection("consultations")
    try:
        oid = ObjectId(consult_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    c = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    status = "accepted" if body.accept else "declined"
    update = {"status": status}
    if body.note is not None:
        update["lawyerNote"] = body.note
    coll.update_one({"_id": oid}, {"$set": update})
    return {"ok": True, "status": status}


@router.patch("/{consult_id}")
def update_consultation(consult_id: str, body: ConsultUpdateBody, user=Depends(get_current_user)):
    """Client can reschedule or update details of their own consultation."""
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can update consultations")
    coll = get_collection("consultations")
    users = get_collection("users")
    try:
        oid = ObjectId(consult_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    c = coll.find_one({"_id": oid, "clientId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    if c.get("status") in {ConsultStatus.declined.value, ConsultStatus.cancelled.value, ConsultStatus.completed.value}:
        raise HTTPException(status_code=400, detail="Cannot modify a completed/declined/cancelled consultation")
    update: dict = {}
    if body.date is not None:
        update["date"] = body.date
    if body.time is not None:
        update["time"] = body.time
    if body.caseDescription is not None:
        update["caseDescription"] = body.caseDescription
    if not update:
        return _consult_to_response(c, users)
    # When rescheduling, push back to pending so lawyer can reconfirm
    update["status"] = ConsultStatus.pending.value
    update["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    coll.update_one({"_id": oid}, {"$set": update})
    c.update(update)
    return _consult_to_response(c, users)


@router.delete("/{consult_id}")
def cancel_consultation(consult_id: str, user=Depends(get_current_user)):
    """Client can cancel their own consultation."""
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can cancel consultations")
    coll = get_collection("consultations")
    users = get_collection("users")
    try:
        oid = ObjectId(consult_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    c = coll.find_one({"_id": oid, "clientId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    if c.get("status") in {ConsultStatus.declined.value, ConsultStatus.cancelled.value, ConsultStatus.completed.value}:
        # idempotent-ish cancel
        return _consult_to_response(c, users)
    coll.update_one(
        {"_id": oid},
        {"$set": {"status": ConsultStatus.cancelled.value, "updatedAt": datetime.utcnow().isoformat() + "Z"}},
    )
    c["status"] = ConsultStatus.cancelled.value
    c["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    return _consult_to_response(c, users)
