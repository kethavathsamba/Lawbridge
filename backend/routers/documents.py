"""Document Management: upload/download/delete, organize by case/category."""

import os
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from bson import ObjectId

from database import get_collection
from deps import get_current_user, require_verified_lawyer

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _out(doc):
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d


@router.get("")
def list_documents(
    caseId: str | None = Query(None),
    user=Depends(get_current_user),
):
    role = user.get("role")
    if role not in {"lawyer", "client"}:
        raise HTTPException(status_code=403, detail="Only clients/lawyers can access documents")
    if role == "lawyer":
        require_verified_lawyer(user)

    coll = get_collection("documents")
    cases = get_collection("cases")
    case_query = {"lawyerId": user["id"]} if role == "lawyer" else {"clientId": user["id"]}
    case_ids = [str(c.get("_id")) for c in cases.find(case_query, {"_id": 1})]
    q = {"caseId": {"$in": case_ids}}
    if caseId:
        if caseId not in case_ids:
            raise HTTPException(status_code=403, detail="You can only view documents for your cases")
        q["caseId"] = caseId
    cursor = coll.find(q).sort("uploadedAt", -1)
    return [_out(d) for d in cursor]


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    caseId: str | None = Query(None),
    category: str | None = Query(None),
    user=Depends(get_current_user),
):
    role = user.get("role")
    if role not in {"lawyer", "client"}:
        raise HTTPException(status_code=403, detail="Only clients/lawyers can upload documents")
    if role == "lawyer":
        require_verified_lawyer(user)
    if not caseId:
        raise HTTPException(status_code=400, detail="caseId is required")

    cases = get_collection("cases")
    try:
        case_oid = ObjectId(caseId)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = cases.find_one({"_id": case_oid})
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if user["id"] not in [c.get("lawyerId"), c.get("clientId")]:
        raise HTTPException(status_code=403, detail="You can only upload documents for your case")

    if not file.filename:
        raise HTTPException(status_code=400, detail="filename required")
    ext = os.path.splitext(file.filename)[1]
    storage_key = f"{user['id']}_{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, storage_key)
    data = await file.read()
    with open(path, "wb") as f:
        f.write(data)

    coll = get_collection("documents")
    doc = {
        "lawyerId": c.get("lawyerId"),
        "clientId": c.get("clientId"),
        "uploadedBy": user["id"],
        "caseId": caseId,
        "filename": file.filename,
        "contentType": file.content_type,
        "size": len(data),
        "storageKey": storage_key,
        "category": category or "case_files",
        "uploadedAt": _now(),
    }
    r = coll.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    return doc


@router.get("/{doc_id}/download")
def download_document(doc_id: str, user=Depends(get_current_user)):
    role = user.get("role")
    if role not in {"lawyer", "client"}:
        raise HTTPException(status_code=403, detail="Only clients/lawyers can download documents")
    if role == "lawyer":
        require_verified_lawyer(user)

    coll = get_collection("documents")
    cases = get_collection("cases")
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    case_id = doc.get("caseId")
    if not case_id:
        raise HTTPException(status_code=404, detail="Document is not linked to a case")
    try:
        case_oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = cases.find_one({"_id": case_oid})
    if not c or user["id"] not in [c.get("lawyerId"), c.get("clientId")]:
        raise HTTPException(status_code=403, detail="You can only access documents for your case")
    storage_key = doc.get("storageKey")
    if not storage_key:
        raise HTTPException(status_code=404, detail="File missing")
    path = os.path.join(UPLOAD_DIR, storage_key)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File missing")
    return FileResponse(path, media_type=doc.get("contentType") or "application/octet-stream", filename=doc.get("filename") or "file")


@router.delete("/{doc_id}")
def delete_document(doc_id: str, user=Depends(get_current_user)):
    role = user.get("role")
    if role not in {"lawyer", "client"}:
        raise HTTPException(status_code=403, detail="Only clients/lawyers can delete documents")
    if role == "lawyer":
        require_verified_lawyer(user)

    coll = get_collection("documents")
    cases = get_collection("cases")
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    case_id = doc.get("caseId")
    try:
        case_oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")
    c = cases.find_one({"_id": case_oid})
    if not c or user["id"] not in [c.get("lawyerId"), c.get("clientId")]:
        raise HTTPException(status_code=403, detail="You can only manage documents for your case")
    if doc.get("uploadedBy") and doc.get("uploadedBy") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the uploader can delete this document")
    storage_key = doc.get("storageKey")
    coll.delete_one({"_id": oid})
    if storage_key:
        path = os.path.join(UPLOAD_DIR, storage_key)
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
    return {"ok": True}

