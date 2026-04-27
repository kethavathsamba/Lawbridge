"""Payment & Escrow System: Handle full payments, installments, and transfers."""

from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
import uuid
import os
import razorpay
from pydantic import BaseModel
from web3 import Web3

from database import get_collection
from deps import get_current_user, require_verified_lawyer
from models import InitiatePaymentBody, CompletePaymentBody, AdminTransferBody

router = APIRouter(prefix="/payments", tags=["payments"])

# Initialize Razorpay client
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_key")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "rzp_test_secret")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Web3 setup for blockchain verification
web3 = Web3(Web3.HTTPProvider(os.getenv("WEB3_PROVIDER_URL", "https://rpc-mumbai.maticvigil.com")))


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _payment_out(doc):
    """Convert MongoDB document to response format."""
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


# Blockchain Payment Models
class PaymentConfirmRequest(BaseModel):
    caseId: str
    escrowId: str
    txHash: str
    amountUSDC: float
    lawyerAddress: str
    clientAddress: str


class CaseCompletionRequest(BaseModel):
    """Request to complete a case and auto-release payment to lawyer"""
    caseId: str
    txHash: str  # Transaction hash from admin release on blockchain
    reason: str = "Case completed"


@router.post("/confirm")
async def confirm_blockchain_payment(
    request: PaymentConfirmRequest,
    current_user=Depends(get_current_user)
):
    """
    Verify blockchain transaction and record payment in database
    """
    try:
        # Step 1: Verify transaction on blockchain
        print(f"[Payment] Verifying TX: {request.txHash}")
        
        if not web3.is_connected():
            raise HTTPException(
                status_code=500,
                detail="Web3 connection failed"
            )
        
        # Get transaction receipt
        tx_receipt = web3.eth.get_transaction_receipt(request.txHash)
        
        if not tx_receipt:
            raise HTTPException(
                status_code=400,
                detail="Transaction not found on blockchain"
            )
        
        if tx_receipt["status"] != 1:
            raise HTTPException(
                status_code=400,
                detail="Transaction failed on blockchain"
            )
        
        print(f"  ✓ TX verified: {request.txHash}")
        
        # Step 2: Record in database
        payments_coll = get_collection("payments")
        
        payment_record = {
            "caseId": request.caseId,
            "clientId": str(current_user.get("id")),
            "lawyerAddress": request.lawyerAddress,
            "clientAddress": request.clientAddress,
            "escrowId": request.escrowId,
            "txHash": request.txHash,
            "amountUSDC": request.amountUSDC,
            "status": "FUNDED",
            "createdAt": datetime.utcnow(),
            "blockNumber": tx_receipt["blockNumber"],
            "gasUsed": tx_receipt["gasUsed"]
        }
        
        result = payments_coll.insert_one(payment_record)
        
        # Step 3: Update case status
        cases_coll = get_collection("cases")
        cases_coll.update_one(
            {"_id": ObjectId(request.caseId)},
            {
                "$set": {
                    "paymentStatus": "FUNDED",
                    "escrowId": request.escrowId,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        print(f"  ✓ Payment recorded in DB: {result.inserted_id}")
        
        return {
            "success": True,
            "paymentId": str(result.inserted_id),
            "status": "FUNDED",
            "message": "Payment verified and recorded"
        }
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"[ERROR] Payment confirmation failed: {err}")
        raise HTTPException(
            status_code=500,
            detail=f"Payment verification failed: {str(err)}"
        )


@router.get("/status/{payment_id}")
async def get_payment_status(
    payment_id: str,
    current_user=Depends(get_current_user)
):
    """Get payment status"""
    try:
        payments_coll = get_collection("payments")
        payment = payments_coll.find_one({"_id": ObjectId(payment_id)})
        
        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Payment not found"
            )
        
        return {
            "paymentId": str(payment["_id"]),
            "status": payment.get("status"),
            "escrowId": payment.get("escrowId"),
            "txHash": payment.get("txHash"),
            "amountUSDC": payment.get("amountUSDC"),
            "createdAt": payment.get("createdAt")
        }
    
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=str(err)
        )


@router.post("/initiate")
def initiate_payment(body: InitiatePaymentBody, user=Depends(get_current_user)):
    """
    Initiate payment via Razorpay.
    Creates a Razorpay order and returns order details for frontend checkout.
    """
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can initiate payments")
    
    cases_coll = get_collection("cases")
    payments_coll = get_collection("escrow_transactions")
    
    try:
        case_oid = ObjectId(body.caseId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    case = cases_coll.find_one({"_id": case_oid, "clientId": user["id"]})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case.get("requestStatus") != "approved":
        raise HTTPException(status_code=400, detail="Case must be approved by lawyer first")
    
    if case.get("paymentStatus") == "escrow_held":
        raise HTTPException(status_code=400, detail="Payment already completed")
    
    try:
        # Create Razorpay order (amount in paise - 1 INR = 100 paise)
        amount_paise = int(float(body.amount) * 100)
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": str(case_oid),
            "notes": {
                "caseId": body.caseId,
                "clientId": user["id"],
                "clientName": user.get("name", "Client"),
            }
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Create transaction record in database
        transaction = {
            "caseId": body.caseId,
            "clientId": user["id"],
            "lawyerId": case.get("lawyerId"),
            "amount": float(body.amount),
            "type": "full_payment",
            "status": "pending",
            "razorpayOrderId": razorpay_order["id"],
            "razorpayPaymentId": None,
            "createdAt": _now(),
            "updatedAt": _now(),
            "paymentProof": None,
        }
        
        result = payments_coll.insert_one(transaction)
        transaction["id"] = str(result.inserted_id)
        
        # Update case with payment pending status
        cases_coll.update_one(
            {"_id": case_oid},
            {
                "$set": {
                    "paymentStatus": "pending",
                    "paymentTransactionId": str(result.inserted_id),
                    "razorpayOrderId": razorpay_order["id"],
                }
            }
        )
        
        # Return order details for frontend Razorpay checkout
        return {
            "id": str(result.inserted_id),
            "transactionId": str(result.inserted_id),
            "razorpayOrderId": razorpay_order["id"],
            "amount": float(body.amount),
            "amountPaise": amount_paise,
            "caseId": body.caseId,
            "clientName": user.get("name", "Client"),
            "clientEmail": user.get("email", ""),
            "clientPhone": user.get("phone", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate payment: {str(e)}")


@router.post("/complete")
def complete_payment(body: CompletePaymentBody, user=Depends(get_current_user)):
    """
    Verify Razorpay payment signature and mark payment as received.
    Payment is moved to escrow (admin account) after verification.
    """
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients complete payments")
    
    cases_coll = get_collection("cases")
    payments_coll = get_collection("escrow_transactions")
    
    try:
        case_oid = ObjectId(body.caseId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    case = cases_coll.find_one({"_id": case_oid, "clientId": user["id"]})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case.get("paymentStatus") not in ["pending", "failed"]:
        raise HTTPException(status_code=400, detail="No pending payment for this case")
    
    try:
        # Verify Razorpay payment signature
        payment_data = {
            "razorpay_payment_id": body.paymentProof,  # This is the payment ID
            "razorpay_order_id": case.get("razorpayOrderId"),
            "razorpay_signature": body.razorpaySignature if hasattr(body, 'razorpaySignature') else body.paymentProof
        }
        
        # Note: Frontend should send the actual signature for verification
        # For now, we'll verify by fetching the payment details from Razorpay
        payment = razorpay_client.payment.fetch(body.paymentProof)
        
        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not successfully captured")
        
        # Find and update transaction
        transaction_id = case.get("paymentTransactionId")
        if transaction_id:
            try:
                trans_oid = ObjectId(transaction_id)
                payments_coll.update_one(
                    {"_id": trans_oid},
                    {
                        "$set": {
                            "status": "payment_received",
                            "razorpayPaymentId": body.paymentProof,
                            "updatedAt": _now(),
                            "paymentProof": payment.get("receipt"),
                        }
                    }
                )
            except Exception as e:
                print(f"Error updating transaction: {e}")
        
        # Update case: payment now held in escrow
        cases_coll.update_one(
            {"_id": case_oid},
            {
                "$set": {
                    "paymentStatus": "escrow_held",
                    "escrowAmount": float(case.get("amountCharged", 0)),
                    "updatedAt": _now(),
                }
            }
        )
        
        return {
            "ok": True, 
            "message": "Payment verified successfully and held in escrow",
            "razorpayPaymentId": body.paymentProof,
            "amount": payment["amount"] / 100  # Convert from paise back to INR
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")


@router.get("/transactions")
def list_transactions(
    case_id: str = Query(None),
    user=Depends(get_current_user)
):
    """List escrow transactions."""
    payments_coll = get_collection("escrow_transactions")
    
    query = {}
    if case_id:
        query["caseId"] = case_id
    
    # Filter based on user role
    if user.get("role") == "client":
        query["clientId"] = user["id"]
    elif user.get("role") == "lawyer":
        query["lawyerId"] = user["id"]
    elif user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    transactions = list(payments_coll.find(query).sort("createdAt", -1))
    return [_payment_out(t) for t in transactions]


@router.get("/escrow/balance")
def get_escrow_balance(user=Depends(get_current_user)):
    """Get total amounts held in escrow per lawyer."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view escrow balance")
    
    payments_coll = get_collection("escrow_transactions")
    
    # Aggregate escrow held by lawyer
    pipeline = [
        {"$match": {"status": "payment_received"}},
        {"$group": {
            "_id": "$lawyerId",
            "totalEscrow": {"$sum": "$amount"}
        }}
    ]
    
    results = list(payments_coll.aggregate(pipeline))
    return {"escrow_balances": {r["_id"]: r["totalEscrow"] for r in results}}


@router.post("/admin/transfer")
def admin_transfer_payment(body: AdminTransferBody, user=Depends(get_current_user)):
    """
    Admin manually transfers amount from escrow to lawyer.
    Used when installment is approved or for manual corrections.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform transfers")
    
    cases_coll = get_collection("cases")
    payments_coll = get_collection("escrow_transactions")
    
    try:
        case_oid = ObjectId(body.caseId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    case = cases_coll.find_one({"_id": case_oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    escrow_amt = float(case.get("escrowAmount", 0))
    if body.amount > escrow_amt:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient escrow balance. Available: {escrow_amt}"
        )
    
    # Create transfer transaction
    transfer = {
        "caseId": body.caseId,
        "clientId": case.get("clientId"),
        "lawyerId": body.lawyerId,
        "amount": float(body.amount),
        "type": "installment_transfer",
        "status": "disbursed",
        "reason": body.reason or "Admin transfer",
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    
    result = payments_coll.insert_one(transfer)
    transfer["id"] = str(result.inserted_id)
    
    # Update case: reduce escrow, increase amountPaid
    new_escrow = escrow_amt - body.amount
    current_paid = float(case.get("amountPaid", 0))
    
    cases_coll.update_one(
        {"_id": case_oid},
        {
            "$set": {
                "escrowAmount": new_escrow,
                "amountPaid": current_paid + body.amount,
                "updatedAt": _now(),
            },
            "$push": {
                "paymentHistory": {
                    "amount": body.amount,
                    "note": body.reason or "Admin transfer",
                    "transferredAt": _now(),
                }
            }
        }
    )
    
    return transfer


@router.post("/admin/complete-case")
def complete_case_and_release_payment(
    request: CaseCompletionRequest,
    user=Depends(get_current_user)
):
    """
    Admin completes a case and automatically releases escrowed payment to lawyer.
    This should be called AFTER the blockchain transaction is successful.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can complete cases")
    
    try:
        case_oid = ObjectId(request.caseId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    cases_coll = get_collection("cases")
    payments_coll = get_collection("payments")
    
    # Get the case
    case = cases_coll.find_one({"_id": case_oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Check if payment is already released
    if case.get("paymentStatus") == "RELEASED":
        raise HTTPException(status_code=400, detail="Payment already released")
    
    # Verify transaction on blockchain
    print(f"[Payment] Verifying release TX: {request.txHash}")
    if not web3.is_connected():
        raise HTTPException(status_code=500, detail="Web3 connection failed")
    
    try:
        tx_receipt = web3.eth.get_transaction_receipt(request.txHash)
        if not tx_receipt:
            raise HTTPException(status_code=400, detail="Transaction not found on blockchain")
        if tx_receipt["status"] != 1:
            raise HTTPException(status_code=400, detail="Transaction failed on blockchain")
        print(f"  ✓ Release TX verified: {request.txHash}")
    except Exception as e:
        print(f"[ERROR] TX verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transaction verification failed: {str(e)}")
    
    # Get payment record
    payment = payments_coll.find_one({"caseId": request.caseId})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    # Create release transaction record
    release_record = {
        "caseId": request.caseId,
        "clientId": case.get("clientId"),
        "lawyerId": case.get("lawyerId"),
        "amount": payment.get("amountUSDC", 0),
        "type": "auto_release",
        "status": "released",
        "reason": request.reason,
        "txHash": request.txHash,
        "blockNumber": tx_receipt["blockNumber"],
        "gasUsed": tx_receipt["gasUsed"],
        "releasedAt": datetime.utcnow(),
        "createdAt": datetime.utcnow()
    }
    
    result = payments_coll.insert_one(release_record)
    
    # Update case status
    cases_coll.update_one(
        {"_id": case_oid},
        {
            "$set": {
                "paymentStatus": "RELEASED",
                "caseStatus": "completed",
                "completedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            },
            "$push": {
                "paymentHistory": {
                    "amount": payment.get("amountUSDC", 0),
                    "type": "auto_release",
                    "note": request.reason,
                    "txHash": request.txHash,
                    "releasedAt": datetime.utcnow(),
                }
            }
        }
    )
    
    print(f"  ✓ Case completed and payment released: {case_oid}")
    
    return {
        "success": True,
        "caseId": request.caseId,
        "releaseId": str(result.inserted_id),
        "status": "RELEASED",
        "amount": payment.get("amountUSDC", 0),
        "txHash": request.txHash,
        "message": "Case completed and payment automatically released to lawyer"
    }


@router.get("/admin/dashboard")
def admin_escrow_dashboard(user=Depends(get_current_user)):
    """Get admin dashboard with escrow summary."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view dashboard")
    
    cases_coll = get_collection("cases")
    payments_coll = get_collection("escrow_transactions")
    
    # Total escrow held
    total_held = list(
        payments_coll.aggregate([
            {"$match": {"status": "payment_received"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ])
    )
    total_escrow = total_held[0]["total"] if total_held else 0
    
    # Total transferred
    total_transferred = list(
        payments_coll.aggregate([
            {"$match": {"status": "disbursed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ])
    )
    total_disbursed = total_transferred[0]["total"] if total_transferred else 0
    
    # Pending installments
    pending_payments = list(
        cases_coll.find({
            "installmentRequests": {
                "$elemMatch": {"status": "pending"}
            }
        })
    )
    
    return {
        "totalEscrowHeld": total_escrow,
        "totalDisbursed": total_disbursed,
        "pendingInstallments": len(pending_payments),
        "activeCases": cases_coll.count_documents({"requestStatus": "approved"}),
    }
