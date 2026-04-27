"""Support chat between users (clients/lawyers) and admins."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import get_collection
from deps import get_current_user, require_role

router = APIRouter(prefix="/support", tags=["support"])


def _now() -> str:
  return datetime.utcnow().isoformat() + "Z"


@router.get("/thread")
def get_my_thread(user=Depends(get_current_user)):
  """Return the support thread for the current user (client or lawyer)."""
  msgs = get_collection("support_messages")
  cursor = msgs.find({"userId": user["id"]}).sort("createdAt", 1)
  out = []
  for m in cursor:
    d = dict(m)
    d["id"] = str(d.pop("_id", ""))
    out.append(d)
  return out


@router.post("/thread")
def send_to_admin(payload: dict, user=Depends(get_current_user)):
  """Send a support message from the current user to admins."""
  body = (payload.get("body") or "").strip()
  if not body:
    raise HTTPException(status_code=400, detail="body is required")
  msgs = get_collection("support_messages")
  doc = {
    "userId": user["id"],
    "userRole": user.get("role"),
    "fromAdmin": False,
    "body": body,
    "createdAt": _now(),
  }
  r = msgs.insert_one(doc)
  doc_out = dict(doc)
  doc_out["id"] = str(r.inserted_id)
  return doc_out


@router.get("/admin/threads")
def list_threads(user=Depends(require_role("admin"))):
  """List distinct user threads for admins."""
  msgs = get_collection("support_messages")
  users = get_collection("users")
  pipeline = [
    {"$sort": {"createdAt": 1}},
    {
      "$group": {
        "_id": "$userId",
        "userId": {"$first": "$userId"},
        "userRole": {"$first": "$userRole"},
        "lastMessageAt": {"$max": "$createdAt"},
      }
    },
    {"$sort": {"lastMessageAt": -1}},
  ]
  results = list(msgs.aggregate(pipeline))
  # Attach user display info (name/email) where possible.
  user_ids = [r["userId"] for r in results if r.get("userId")]
  users_by_id: dict[str, dict] = {}
  object_ids: list[ObjectId] = []
  for uid in user_ids:
    try:
      object_ids.append(ObjectId(uid))
    except Exception:
      continue
  if object_ids:
    cursor = users.find({"_id": {"$in": object_ids}})
    for u in cursor:
      users_by_id[str(u["_id"])] = {
        "name": u.get("name"),
        "email": u.get("email"),
      }
  enriched: list[dict] = []
  for r in results:
    uid = r.get("userId")
    info = users_by_id.get(uid, {})
    enriched.append(
      {
        "id": r["_id"],
        "userId": uid,
        "userRole": r.get("userRole"),
        "lastMessageAt": r.get("lastMessageAt"),
        "userName": info.get("name"),
        "userEmail": info.get("email"),
      }
    )
  return enriched


@router.get("/admin/thread/{user_id}")
def get_thread_for_user(user_id: str, user=Depends(require_role("admin"))):
  """Get the full thread for a specific user."""
  msgs = get_collection("support_messages")
  cursor = msgs.find({"userId": user_id}).sort("createdAt", 1)
  out = []
  for m in cursor:
    d = dict(m)
    d["id"] = str(d.pop("_id", ""))
    out.append(d)
  return out


@router.post("/admin/thread/{user_id}")
def admin_reply(user_id: str, payload: dict, user=Depends(require_role("admin"))):
  """Send a reply from admin into a user's support thread."""
  body = (payload.get("body") or "").strip()
  if not body:
    raise HTTPException(status_code=400, detail="body is required")
  msgs = get_collection("support_messages")
  doc = {
    "userId": user_id,
    "userRole": "admin-target",
    "fromAdmin": True,
    "body": body,
    "createdAt": _now(),
  }
  r = msgs.insert_one(doc)
  doc_out = dict(doc)
  doc_out["id"] = str(r.inserted_id)
  return doc_out

