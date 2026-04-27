"""Messaging: conversations and messages (polling-based)."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId

from database import get_collection
from deps import require_verified_lawyer, get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _out(doc):
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


@router.get("/conversations")
def list_conversations(user=Depends(require_verified_lawyer)):
    coll = get_collection("conversations")
    cursor = coll.find({"lawyerId": user["id"]}).sort("lastMessageAt", -1)
    return [_out(d) for d in cursor]


@router.get("/client/conversations")
def list_client_conversations(user=Depends(get_current_user)):
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can access this")
    coll = get_collection("conversations")
    cursor = coll.find({"clientId": user["id"]}).sort("lastMessageAt", -1)
    return [_out(d) for d in cursor]


@router.post("/conversations")
def create_conversation(payload: dict, user=Depends(require_verified_lawyer)):
    clientId = payload.get("clientId")
    if not clientId:
        raise HTTPException(status_code=400, detail="clientId is required")
    coll = get_collection("conversations")
    existing = coll.find_one({"lawyerId": user["id"], "clientId": clientId})
    if existing:
        return _out(existing)
    doc = {"lawyerId": user["id"], "clientId": clientId, "createdAt": _now(), "lastMessageAt": _now()}
    r = coll.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    return doc


@router.get("/client/conversation-for-lawyer/{lawyer_id}")
def client_conversation_for_lawyer(lawyer_id: str, user=Depends(get_current_user)):
    """Client helper: get or create a conversation with a specific lawyer."""
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can access this")
    coll = get_collection("conversations")
    existing = coll.find_one({"lawyerId": lawyer_id, "clientId": user["id"]})
    if existing:
        return _out(existing)
    doc = {
        "lawyerId": lawyer_id,
        "clientId": user["id"],
        "createdAt": _now(),
        "lastMessageAt": _now(),
    }
    r = coll.insert_one(doc)
    created = coll.find_one({"_id": r.inserted_id})
    return _out(created)


@router.get("/client/conversation-for-case/{case_id}")
def client_conversation_for_case(case_id: str, user=Depends(get_current_user)):
    """Client helper: get or create a conversation for a specific case."""
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can access this")
    cases = get_collection("cases")
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = cases.find_one({"_id": oid, "clientId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    request_status = c.get("requestStatus")
    if request_status and request_status != "approved":
        raise HTTPException(status_code=403, detail="Chat is available only after lawyer approval")
    lawyer_id = c.get("lawyerId")
    if not lawyer_id:
        raise HTTPException(status_code=400, detail="Case has no lawyer assigned")

    coll = get_collection("conversations")
    existing = coll.find_one({"lawyerId": lawyer_id, "clientId": user["id"], "caseId": case_id})
    if existing:
        return _out(existing)
    if str(c.get("status") or "").lower() == "closed":
        raise HTTPException(status_code=403, detail="No conversation found. Closed-case chat is read-only")
    doc = {
        "lawyerId": lawyer_id,
        "clientId": user["id"],
        "caseId": case_id,
        "createdAt": _now(),
        "lastMessageAt": _now(),
    }
    r = coll.insert_one(doc)
    created = coll.find_one({"_id": r.inserted_id})
    return _out(created)


@router.get("/conversation-for-case/{case_id}")
def lawyer_conversation_for_case(case_id: str, user=Depends(require_verified_lawyer)):
    """Lawyer helper: get or create a conversation for a specific case."""
    cases = get_collection("cases")
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = cases.find_one({"_id": oid, "lawyerId": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if c.get("requestStatus") != "approved":
        raise HTTPException(status_code=403, detail="Chat is available only after approval")
    client_id = c.get("clientId")
    if not client_id:
        raise HTTPException(status_code=400, detail="Case has no client assigned")

    coll = get_collection("conversations")
    existing = coll.find_one({"lawyerId": user["id"], "clientId": client_id, "caseId": case_id})
    if existing:
        return _out(existing)
    if str(c.get("status") or "").lower() == "closed":
        raise HTTPException(status_code=403, detail="No conversation found. Closed-case chat is read-only")
    doc = {
        "lawyerId": user["id"],
        "clientId": client_id,
        "caseId": case_id,
        "createdAt": _now(),
        "lastMessageAt": _now(),
    }
    r = coll.insert_one(doc)
    created = coll.find_one({"_id": r.inserted_id})
    return _out(created)


@router.get("/threads/{conversation_id}")
def list_messages(conversation_id: str, user=Depends(get_current_user)):
    convs = get_collection("conversations")
    msgs = get_collection("messages")
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = convs.find_one({"_id": oid})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user["id"] not in [conv.get("lawyerId"), conv.get("clientId")]:
        raise HTTPException(status_code=403, detail="Forbidden")
    cursor = msgs.find({"conversationId": conversation_id}).sort("createdAt", 1)
    return [_out(m) for m in cursor]


@router.get("/client/threads/{conversation_id}")
def list_messages_client(conversation_id: str, user=Depends(get_current_user)):
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can access this")
    convs = get_collection("conversations")
    msgs = get_collection("messages")
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = convs.find_one({"_id": oid, "clientId": user["id"]})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    cursor = msgs.find({"conversationId": conversation_id}).sort("createdAt", 1)
    return [_out(m) for m in cursor]


@router.post("/threads/{conversation_id}")
def send_message(conversation_id: str, payload: dict, user=Depends(get_current_user)):
    body = (payload.get("body") or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="body is required")
    convs = get_collection("conversations")
    msgs = get_collection("messages")
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = convs.find_one({"_id": oid})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user["id"] not in [conv.get("lawyerId"), conv.get("clientId")]:
        raise HTTPException(status_code=403, detail="Forbidden")
    case_id = conv.get("caseId")
    if case_id:
        cases = get_collection("cases")
        try:
            case_oid = ObjectId(case_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Case not found")
        c = cases.find_one({"_id": case_oid})
        if not c:
            raise HTTPException(status_code=404, detail="Case not found")
        if str(c.get("status") or "").lower() == "closed":
            raise HTTPException(status_code=403, detail="Chat is not available after case is closed")
    receiver_id = conv.get("clientId") if user["id"] == conv.get("lawyerId") else conv.get("lawyerId")
    doc = {
        "conversationId": conversation_id,
        "senderId": user["id"],
        "receiverId": receiver_id,
        "body": body,
        "attachments": payload.get("attachments") or [],
        "createdAt": _now(),
        "readAt": None,
    }
    r = msgs.insert_one(doc)
    convs.update_one({"_id": oid}, {"$set": {"lastMessageAt": _now()}})
    created = msgs.find_one({"_id": r.inserted_id})
    return _out(created)


@router.post("/client/threads/{conversation_id}")
def send_message_client(conversation_id: str, payload: dict, user=Depends(get_current_user)):
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Only clients can send here")
    body = (payload.get("body") or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="body is required")
    convs = get_collection("conversations")
    msgs = get_collection("messages")
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = convs.find_one({"_id": oid, "clientId": user["id"]})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    case_id = conv.get("caseId")
    if case_id:
        cases = get_collection("cases")
        try:
            case_oid = ObjectId(case_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Case not found")
        c = cases.find_one({"_id": case_oid})
        if not c:
            raise HTTPException(status_code=404, detail="Case not found")
        if str(c.get("status") or "").lower() == "closed":
            raise HTTPException(status_code=403, detail="Chat is not available after case is closed")
    doc = {
        "conversationId": conversation_id,
        "senderId": user["id"],
        "receiverId": conv.get("lawyerId"),
        "body": body,
        "attachments": payload.get("attachments") or [],
        "createdAt": _now(),
        "readAt": None,
    }
    r = msgs.insert_one(doc)
    convs.update_one({"_id": oid}, {"$set": {"lastMessageAt": _now()}})
    created = msgs.find_one({"_id": r.inserted_id})
    return _out(created)


@router.post("/threads/{conversation_id}/mark-read")
def mark_read(conversation_id: str, user=Depends(require_verified_lawyer)):
    msgs = get_collection("messages")
    msgs.update_many(
        {"conversationId": conversation_id, "receiverId": user["id"], "readAt": None},
        {"$set": {"readAt": _now()}},
    )
    return {"ok": True}

