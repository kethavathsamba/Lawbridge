"""Cases: list, create, update."""
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
import re
import uuid
import logging
from database import get_collection
from deps import get_current_user, require_verified_lawyer

try:
    from contract_deployer import create_deployment_instructions
    BLOCKCHAIN_ENABLED = True
except ImportError:
    BLOCKCHAIN_ENABLED = False
    def create_deployment_instructions(*args, **kwargs):
        return {"error": "Blockchain service not configured"}

from models import (
    CaseCreateBody,
    CaseUpdateBody,
    CaseDecisionBody,
    CasePaymentBody,
    CaseInstallmentDecisionBody,
    CaseCloseRequestBody,
    CaseCloseDecisionBody,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases", tags=["cases"])


def _money_to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return 0.0
    m = re.search(r"(\d+(?:\.\d+)?)", s.replace(",", ""))
    return float(m.group(1)) if m else 0.0


def _case_to_response(c):
    out = dict(c)
    out["id"] = str(out.pop("_id", out.get("id")))
    if not out.get("requestStatus"):
        out["requestStatus"] = "approved" if out.get("status") != "Pending Approval" else "pending"
    if not isinstance(out.get("paymentHistory"), list):
        out["paymentHistory"] = []
    if not isinstance(out.get("installmentRequests"), list):
        out["installmentRequests"] = []
    if not isinstance(out.get("closeRequest"), dict):
        out["closeRequest"] = None
    return out


@router.get("")
def list_cases(user=Depends(get_current_user)):
    coll = get_collection("cases")
    users = get_collection("users")
    lawyers_coll = get_collection("lawyers")
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
    lawyer_profiles = {str(p.get("userId")): p for p in lawyers_coll.find({}) if p.get("userId")}
    out = []
    for d in cursor:
        item = _case_to_response(d)
        client = users.find_one({"_id": ObjectId(item["clientId"])}) if item.get("clientId") else None
        lawyer = users.find_one({"_id": ObjectId(item["lawyerId"])}) if item.get("lawyerId") else None
        item["clientName"] = client.get("name") if client else None
        item["clientEmail"] = client.get("email") if client else None
        item["clientPhone"] = client.get("phone") if client else None
        item["lawyerName"] = lawyer.get("name") if lawyer else None
        item["lawyerEmail"] = lawyer.get("email") if lawyer else None
        item["lawyerPhone"] = lawyer.get("phone") if lawyer else None
        lp = lawyer_profiles.get(item.get("lawyerId")) or {}
        item["lawyerFee"] = lp.get("fee")
        item["lawyerCaseFee"] = lp.get("caseFee")
        out.append(item)
    return out


@router.post("")
def create_case(body: CaseCreateBody, user=Depends(get_current_user)):
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can create cases")
    coll = get_collection("cases")
    lawyers_coll = get_collection("lawyers")
    users_coll = get_collection("users")
    
    # Get lawyer and client wallet addresses
    lawyer_user = users_coll.find_one({"_id": ObjectId(body.lawyerId)})
    client_user = users_coll.find_one({"_id": ObjectId(user["id"])})
    
    lawyer_wallet = lawyer_user.get("walletAddress") if lawyer_user else None
    client_wallet = client_user.get("walletAddress") if client_user else None
    platform_wallet = "0x5141Ee6E996Fd9653fB4467d4c86471084FF3D29"  # Platform admin address
    
    profile = lawyers_coll.find_one({"userId": body.lawyerId}) or {}
    default_offer = _money_to_float(profile.get("caseFee"))
    offered_amount = float(body.offeredAmount or 0)
    if offered_amount <= 0:
        offered_amount = default_offer
    amount_charged = float(body.amountCharged or 0)
    if amount_charged <= 0:
        amount_charged = offered_amount if offered_amount > 0 else default_offer
    
    # Prepare case document
    doc = {
        "clientId": user["id"],
        "lawyerId": body.lawyerId,
        "title": body.title,
        "notes": body.notes or "",
        "status": "Pending Approval",
        "requestStatus": "pending",
        "decisionNote": None,
        "approvedAt": None,
        "rejectedAt": None,
        "courtName": body.courtName,
        "caseType": body.caseType,
        "description": body.description or "",
        "filingDate": body.filingDate,
        "hearingDates": body.hearingDates or [],
        "offeredAmount": offered_amount,
        "amountCharged": amount_charged,
        "amountPaid": float(body.amountPaid or 0),
        "paymentStatus": "unpaid",  # not yet approved/initiated payment
        "escrowAmount": 0.0,  # will be set when case is approved
        "paymentTransactionId": None,  # link to escrow_transactions
        "paymentHistory": [],
        "installmentRequests": [],
        "nextHearing": None,
        "closeRequest": None,
        "documents": [],
        "escrowContractAddress": None,  # Will be set after deployment
        "escrowDeploymentInfo": None,  # Deployment instructions
        "clientWalletAddress": client_wallet,
        "lawyerWalletAddress": lawyer_wallet,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }
    
    # Insert case first
    r = coll.insert_one(doc)
    case_id = str(r.inserted_id)
    doc["id"] = case_id
    del doc["_id"]
    
    # Generate contract deployment information if wallet addresses exist
    deployment_info = None
    if lawyer_wallet and client_wallet:
        try:
            deployment_info = create_deployment_instructions(
                case_id=case_id,
                lawyer_address=lawyer_wallet,
                platform_address=platform_wallet
            )
            
            # Update case with deployment information
            coll.update_one(
                {"_id": ObjectId(case_id)},
                {"$set": {"escrowDeploymentInfo": deployment_info}}
            )
            doc["escrowDeploymentInfo"] = deployment_info
            
            logger.info(f"Created deployment instructions for case {case_id}")
        except Exception as e:
            logger.error(f"Failed to create deployment instructions: {e}")
            # Don't fail the case creation, just log the error
    else:
        logger.warning(f"Case {case_id}: Missing wallet addresses. Client: {client_wallet}, Lawyer: {lawyer_wallet}")
        doc["escrowDeploymentInfo"] = {
            "status": "PENDING_WALLET_SETUP",
            "message": "Waiting for client and lawyer to connect wallets in Settings"
        }
    
    return doc


@router.post("/{case_id}/decision")
def decide_case_request(case_id: str, body: CaseDecisionBody, user=Depends(get_current_user)):
    if user.get("role") != "lawyer":
        raise HTTPException(status_code=403, detail="Only lawyers can review case requests")
    require_verified_lawyer(user)
    coll = get_collection("cases")
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if c.get("requestStatus") in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Case request already reviewed")

    now = datetime.utcnow().isoformat() + "Z"
    if body.approve:
        updates = {
            "requestStatus": "approved",
            "status": "Open",
            "decisionNote": body.note or None,
            "approvedAt": now,
            "rejectedAt": None,
            "paymentStatus": "pending",  # Payment now required
            "escrowAmount": float(c.get("amountCharged") or 0),  # Amount to hold in escrow
            "paidAmount": 0.0,  # Reset paid amount (escrow is separate)
        }
        coll.update_one({"_id": oid}, {"$set": updates})
        updated = coll.find_one({"_id": oid})
        return _case_to_response(updated)
    else:
        # Reject means delete the request from active case pipeline.
        convs = get_collection("conversations")
        msgs = get_collection("messages")
        conv_cursor = list(convs.find({"caseId": case_id}))
        conv_ids = [str(x.get("_id")) for x in conv_cursor if x.get("_id")]
        if conv_ids:
            msgs.delete_many({"conversationId": {"$in": conv_ids}})
        convs.delete_many({"caseId": case_id})
        coll.delete_one({"_id": oid})
        return {"ok": True, "deleted": True, "id": case_id}


@router.post("/{case_id}/payments")
def add_case_payment(case_id: str, body: CasePaymentBody, user=Depends(get_current_user)):
    if user.get("role") != "lawyer":
        raise HTTPException(status_code=403, detail="Only lawyers can add case payments")
    require_verified_lawyer(user)
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
    if not (body.note or "").strip():
        raise HTTPException(status_code=400, detail="Progress note is required for installment request")

    coll = get_collection("cases")
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = coll.find_one({"_id": oid, "lawyerId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if c.get("requestStatus") != "approved":
        raise HTTPException(status_code=400, detail="Payments can be added only after approval")
    if str(c.get("status") or "").lower() == "closed":
        raise HTTPException(status_code=400, detail="No installment activity is allowed after case is closed")

    now = datetime.utcnow().isoformat() + "Z"
    req = {
        "id": uuid.uuid4().hex,
        "amount": float(body.amount),
        "progressNote": body.note.strip(),
        "status": "pending",
        "createdAt": now,
        "approvedAt": None,
    }
    coll.update_one(
        {"_id": oid},
        {
            "$push": {"installmentRequests": req},
        },
    )
    updated = coll.find_one({"_id": oid})
    return _case_to_response(updated)


@router.post("/{case_id}/close-request")
def request_close_case(case_id: str, body: CaseCloseRequestBody, user=Depends(get_current_user)):
    if user.get("role") not in {"client", "lawyer"}:
        raise HTTPException(status_code=403, detail="Only client/lawyer can request case closure")
    coll = get_collection("cases")
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    q = {"_id": oid, "clientId": user["id"]} if user.get("role") == "client" else {"_id": oid, "lawyerId": user["id"]}
    c = coll.find_one(q)
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if c.get("requestStatus") != "approved":
        raise HTTPException(status_code=400, detail="Case must be approved before closing")
    if str(c.get("status", "")).lower() == "closed":
        raise HTTPException(status_code=400, detail="Case is already closed")
    close_req = c.get("closeRequest") or {}
    if close_req.get("status") == "pending":
        raise HTTPException(status_code=400, detail="A close case request is already pending")

    now = datetime.utcnow().isoformat() + "Z"
    new_req = {
        "id": uuid.uuid4().hex,
        "status": "pending",
        "requestedByRole": user.get("role"),
        "requestedBy": user["id"],
        "note": (body.note or "").strip() or None,
        "createdAt": now,
        "decidedAt": None,
        "decisionByRole": None,
    }
    coll.update_one({"_id": oid}, {"$set": {"closeRequest": new_req}})
    updated = coll.find_one({"_id": oid})
    return _case_to_response(updated)


@router.post("/{case_id}/close-request/decision")
def decide_close_case(case_id: str, body: CaseCloseDecisionBody, user=Depends(get_current_user)):
    if user.get("role") not in {"client", "lawyer"}:
        raise HTTPException(status_code=403, detail="Only client/lawyer can review case closure requests")
    coll = get_collection("cases")
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    q = {"_id": oid, "clientId": user["id"]} if user.get("role") == "client" else {"_id": oid, "lawyerId": user["id"]}
    c = coll.find_one(q)
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    close_req = c.get("closeRequest") or {}
    if close_req.get("status") != "pending":
        raise HTTPException(status_code=400, detail="No pending close case request found")
    if close_req.get("requestedByRole") == user.get("role"):
        raise HTTPException(status_code=403, detail="You cannot review your own close case request")

    now = datetime.utcnow().isoformat() + "Z"
    close_req["status"] = "approved" if body.approve else "rejected"
    close_req["decidedAt"] = now
    close_req["decisionByRole"] = user.get("role")
    updates = {"closeRequest": close_req}
    if body.approve:
        charged = float(c.get("amountCharged") or 0)
        paid = float(c.get("amountPaid") or 0)
        remaining = max(0.0, charged - paid)
        updates["status"] = "Closed"
        if remaining > 0:
            updates["amountPaid"] = paid + remaining
            payment_history = c.get("paymentHistory") or []
            payment_history.append(
                {
                    "amount": remaining,
                    "note": "Auto transfer on close-case approval",
                    "createdAt": now,
                }
            )
            updates["paymentHistory"] = payment_history

    coll.update_one({"_id": oid}, {"$set": updates})
    updated = coll.find_one({"_id": oid})
    return _case_to_response(updated)


@router.post("/{case_id}/payments/{request_id}/decision")
def decide_installment_request(
    case_id: str,
    request_id: str,
    body: CaseInstallmentDecisionBody,
    user=Depends(get_current_user),
):
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can approve installment requests")
    coll = get_collection("cases")
    payments_coll = get_collection("escrow_transactions")
    
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = coll.find_one({"_id": oid, "clientId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if str(c.get("status") or "").lower() == "closed":
        raise HTTPException(status_code=400, detail="No installment activity is allowed after case is closed")
    reqs = c.get("installmentRequests") or []
    idx = next((i for i, r in enumerate(reqs) if str(r.get("id")) == request_id), -1)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Installment request not found")
    if reqs[idx].get("status") != "pending":
        raise HTTPException(status_code=400, detail="Installment request already reviewed")

    now = datetime.utcnow().isoformat() + "Z"
    reqs[idx]["status"] = "approved" if body.approve else "rejected"
    reqs[idx]["approvedAt"] = now
    updates = {"installmentRequests": reqs}
    
    if body.approve:
        amt = float(reqs[idx].get("amount") or 0)
        escrow_amt = float(c.get("escrowAmount") or 0)
        
        # Check if sufficient amount in escrow
        if amt > escrow_amt:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient escrow balance. Available: {escrow_amt}, Requested: {amt}"
            )
        
        # Create escrow transfer transaction
        transfer = {
            "caseId": case_id,
            "clientId": user["id"],
            "lawyerId": c.get("lawyerId"),
            "amount": amt,
            "type": "installment_transfer",
            "status": "disbursed",
            "reason": f"Installment approved by client: {reqs[idx].get('progressNote', '')}",
            "createdAt": now,
            "updatedAt": now,
        }
        payments_coll.insert_one(transfer)
        
        # Update case: reduce escrow, increase amountPaid
        new_escrow = escrow_amt - amt
        current_paid = float(c.get("amountPaid") or 0)
        
        updates["amountPaid"] = current_paid + amt
        updates["escrowAmount"] = new_escrow
        
        payment_history = c.get("paymentHistory") or []
        payment_history.append(
            {
                "amount": amt,
                "note": reqs[idx].get("progressNote"),
                "transferredTo": "lawyer",
                "createdAt": now,
            }
        )
        updates["paymentHistory"] = payment_history

    coll.update_one({"_id": oid}, {"$set": updates})
    updated = coll.find_one({"_id": oid})
    return _case_to_response(updated)


@router.patch("/{case_id}")
def update_case(case_id: str, body: CaseUpdateBody, user=Depends(get_current_user)):
    coll = get_collection("cases")
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = coll.find_one({"_id": oid})
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if user["role"] == "client" and c["clientId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "lawyer" and c["lawyerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = body.model_dump(exclude_none=True)
    if data:
        coll.update_one({"_id": oid}, {"$set": data})
    c = coll.find_one({"_id": oid})
    return _case_to_response(c)
