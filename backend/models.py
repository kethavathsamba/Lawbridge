"""Pydantic models for request/response."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    client = "client"
    lawyer = "lawyer"
    admin = "admin"


class CaseStatus(str, Enum):
    pending = "Pending"
    in_progress = "In Progress"
    court_filed = "Court Filed"
    closed = "Closed"


class ConsultType(str, Enum):
    phone = "phone"
    chat = "chat"
    inperson = "inperson"


class ConsultStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    completed = "completed"
    cancelled = "cancelled"


# Auth
class RegisterBody(BaseModel):
    fullName: str
    email: EmailStr
    phone: str
    password: str
    userType: str  # client | lawyer
    address: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[str] = None
    barCouncilId: Optional[str] = None
    location: Optional[str] = None
    caseFee: Optional[str] = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str
    rememberMe: Optional[bool] = False


class ForgotPasswordBody(BaseModel):
    email: EmailStr


# Lawyer profile (for lawyers collection / update)
class LawyerProfileBody(BaseModel):
    # user fields (stored in users collection)
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    # profile fields (stored in lawyers collection)
    qualification: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[str] = None
    barCouncilId: Optional[str] = None
    fee: Optional[str] = None
    caseFee: Optional[str] = None
    availability: Optional[str] = None
    languages: Optional[list[str]] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    available: Optional[bool] = None
    imgColor: Optional[str] = None


# Case
class CaseCreateBody(BaseModel):
    lawyerId: str
    title: str
    notes: Optional[str] = None
    courtName: Optional[str] = None
    caseType: Optional[str] = None
    description: Optional[str] = None
    filingDate: Optional[str] = None
    hearingDates: Optional[list[str]] = None
    offeredAmount: Optional[float] = 0
    amountCharged: Optional[float] = 0
    amountPaid: Optional[float] = 0


class CaseUpdateBody(BaseModel):
    status: Optional[str] = None
    nextHearing: Optional[str] = None
    notes: Optional[str] = None
    courtName: Optional[str] = None
    caseType: Optional[str] = None
    description: Optional[str] = None
    filingDate: Optional[str] = None
    hearingDates: Optional[list[str]] = None
    documents: Optional[list[dict]] = None
    amountCharged: Optional[float] = None
    amountPaid: Optional[float] = None


class CaseDecisionBody(BaseModel):
    approve: bool
    note: Optional[str] = None


class CasePaymentBody(BaseModel):
    amount: float
    note: Optional[str] = None


class CaseInstallmentDecisionBody(BaseModel):
    approve: bool


class CaseCloseRequestBody(BaseModel):
    note: Optional[str] = None


class CaseCloseDecisionBody(BaseModel):
    approve: bool


# Consultation
class BookConsultationBody(BaseModel):
    lawyerId: str
    consultType: str
    date: str
    time: str
    caseDescription: Optional[str] = None


class ConsultRespondBody(BaseModel):
    accept: bool  # True = accept, False = decline
    note: Optional[str] = None


class ConsultUpdateBody(BaseModel):
    """Client-side update of an existing consultation (typically reschedule)."""

    date: Optional[str] = None
    time: Optional[str] = None
    caseDescription: Optional[str] = None


# Payment / Escrow
class PaymentStatusEnum(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class EscrowTransactionTypeEnum(str, Enum):
    full_payment = "full_payment"  # Client pays full amount when case accepted
    installment_transfer = "installment_transfer"  # Transfer from escrow to lawyer
    refund = "refund"  # Refund to client


class EscrowTransactionStatusEnum(str, Enum):
    pending = "pending"  # Awaiting completion
    payment_received = "payment_received"  # Full payment received from client
    disbursed = "disbursed"  # Transfer completed to lawyer
    rejected = "rejected"  # Client rejected installment request
    cancelled = "cancelled"  # Transaction cancelled


class InitiatePaymentBody(BaseModel):
    """Initiate payment when case is accepted."""
    caseId: str
    amount: float


class CompletePaymentBody(BaseModel):
    """Mark payment as received (from payment provider webhook)."""
    caseId: str
    transactionId: Optional[str] = None
    paymentProof: Optional[str] = None


class AdminTransferBody(BaseModel):
    """Admin initiated transfer from escrow to lawyer."""
    caseId: str
    lawyerId: str
    amount: float
    reason: Optional[str] = None
