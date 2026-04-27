"""Billing: invoices and payment status."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId

from database import get_collection
from deps import require_verified_lawyer

router = APIRouter(prefix="/billing", tags=["billing"])


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _out(doc):
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


@router.get("/invoices")
def list_invoices(status: str | None = Query(None), user=Depends(require_verified_lawyer)):
    coll = get_collection("invoices")
    q = {"lawyerId": user["id"]}
    if status:
        q["status"] = status
    cursor = coll.find(q).sort("createdAt", -1)
    return [_out(d) for d in cursor]


@router.post("/invoices")
def create_invoice(payload: dict, user=Depends(require_verified_lawyer)):
    clientId = payload.get("clientId")
    items = payload.get("items") or []
    total = payload.get("total")
    if not clientId:
        raise HTTPException(status_code=400, detail="clientId is required")
    if total is None:
        raise HTTPException(status_code=400, detail="total is required")
    coll = get_collection("invoices")
    doc = {
        "lawyerId": user["id"],
        "clientId": clientId,
        "caseId": payload.get("caseId"),
        "items": items,
        "total": total,
        "status": payload.get("status") or "pending",
        "issuedAt": payload.get("issuedAt") or _now(),
        "dueAt": payload.get("dueAt"),
        "paidAt": payload.get("paidAt"),
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    r = coll.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    return doc


@router.patch("/invoices/{invoice_id}")
def update_invoice(invoice_id: str, payload: dict, user=Depends(require_verified_lawyer)):
    coll = get_collection("invoices")
    try:
        oid = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")
    doc = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    update = {}
    for k in ["items", "total", "status", "issuedAt", "dueAt", "paidAt", "clientId", "caseId"]:
        if k in payload:
            update[k] = payload.get(k)
    if not update:
        return {"ok": True}
    if update.get("status") == "paid" and not update.get("paidAt"):
        update["paidAt"] = _now()
    update["updatedAt"] = _now()
    coll.update_one({"_id": oid}, {"$set": update})
    doc = coll.find_one({"_id": oid})
    return _out(doc)


@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: str, user=Depends(require_verified_lawyer)):
    coll = get_collection("invoices")
    try:
        oid = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invoice not found")
    coll.delete_one({"_id": oid, "lawyerId": user["id"]})
    return {"ok": True}

