import uuid
import models
from firebase_admin import auth as firebase_auth
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional
from dependencies import get_db

router = APIRouter(prefix="/messages", tags=["messages"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class AuthenticatedRequest(BaseModel):
    id_token: str

class SendMessageRequest(BaseModel):
    id_token: str
    recipient_id: str
    subject: str
    body: str

class MarkReadRequest(BaseModel):
    id_token: str
    message_id: str


# ── Helpers ───────────────────────────────────────────────────────

def _verify_user(id_token: str, db: Session) -> models.User:
    """Verify Firebase token and return the user."""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = db.query(models.User).filter(models.User.id == decoded["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _message_to_dict(msg: models.Message, db: Session) -> dict:
    sender = db.query(models.User).filter(models.User.id == msg.sender_id).first()
    recipient = db.query(models.User).filter(models.User.id == msg.recipient_id).first()
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_name": sender.full_name if sender else "Unknown",
        "sender_role": sender.role if sender else None,
        "recipient_id": msg.recipient_id,
        "recipient_name": recipient.full_name if recipient else "Unknown",
        "recipient_role": recipient.role if recipient else None,
        "subject": msg.subject,
        "body": msg.body,
        "read": msg.read,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/inbox")
async def get_inbox(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Get messages received by the authenticated user."""
    user = _verify_user(request.id_token, db)
    messages = (
        db.query(models.Message)
        .filter(models.Message.recipient_id == user.id)
        .order_by(models.Message.created_at.desc())
        .all()
    )
    return [_message_to_dict(m, db) for m in messages]


@router.post("/sent")
async def get_sent(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Get messages sent by the authenticated user."""
    user = _verify_user(request.id_token, db)
    messages = (
        db.query(models.Message)
        .filter(models.Message.sender_id == user.id)
        .order_by(models.Message.created_at.desc())
        .all()
    )
    return [_message_to_dict(m, db) for m in messages]


@router.post("/send")
async def send_message(request: SendMessageRequest, db: Session = Depends(get_db)):
    """Send a message to another user."""
    sender = _verify_user(request.id_token, db)

    recipient = db.query(models.User).filter(models.User.id == request.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    msg = models.Message(
        id=str(uuid.uuid4()),
        sender_id=sender.id,
        recipient_id=recipient.id,
        subject=request.subject,
        body=request.body,
    )
    db.add(msg)
    db.commit()
    return _message_to_dict(msg, db)


@router.post("/mark-read")
async def mark_read(request: MarkReadRequest, db: Session = Depends(get_db)):
    """Mark a message as read."""
    user = _verify_user(request.id_token, db)
    msg = db.query(models.Message).filter(
        models.Message.id == request.message_id,
        models.Message.recipient_id == user.id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.read = True
    db.commit()
    return {"id": msg.id, "read": True}


@router.post("/contacts")
async def get_contacts(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """
    Get the list of users this person can message.
    Teachers see parents of their students.
    Parents see teachers of their children.
    """
    user = _verify_user(request.id_token, db)

    if user.role == "teacher":
        # Get parent IDs of the teacher's students
        students = db.query(models.Student).filter(models.Student.teacher_id == user.id).all()
        parent_ids = list({s.parent_id for s in students})
        if not parent_ids:
            return []
        parents = db.query(models.User).filter(models.User.id.in_(parent_ids)).all()
        contacts = []
        for p in parents:
            # Find which children belong to this parent (and are assigned to this teacher)
            children = [s for s in students if s.parent_id == p.id]
            contacts.append({
                "id": p.id,
                "name": p.full_name or p.email,
                "role": "parent",
                "children": [{"id": c.id, "name": c.name} for c in children],
            })
        return contacts

    elif user.role == "parent":
        # Get teacher IDs of the parent's children
        children = db.query(models.Student).filter(models.Student.parent_id == user.id).all()
        teacher_ids = list({c.teacher_id for c in children if c.teacher_id})
        if not teacher_ids:
            return []
        teachers = db.query(models.User).filter(models.User.id.in_(teacher_ids)).all()
        contacts = []
        for t in teachers:
            child_names = [c.name for c in children if c.teacher_id == t.id]
            contacts.append({
                "id": t.id,
                "name": t.full_name or t.email,
                "role": "teacher",
                "children": [{"name": n} for n in child_names],
            })
        return contacts

    return []


@router.post("/unread-count")
async def unread_count(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Get unread message count for the authenticated user."""
    user = _verify_user(request.id_token, db)
    count = db.query(func.count(models.Message.id)).filter(
        models.Message.recipient_id == user.id,
        models.Message.read == False,
    ).scalar()
    return {"unread": count}
