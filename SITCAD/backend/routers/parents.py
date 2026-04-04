import uuid
import models
from firebase_admin import auth as firebase_auth
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from dependencies import get_db

router = APIRouter(prefix="/parents", tags=["parents"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class AuthenticatedRequest(BaseModel):
    id_token: str

class ParentCreateChild(BaseModel):
    id_token: str
    name: str
    age: int

class StudentOut(BaseModel):
    id: str
    name: str
    age: int
    classroom: Optional[str]
    parent_id: str
    teacher_id: Optional[str]
    enrollment_date: date
    needs_intervention: bool

    class Config:
        from_attributes = True

class StudentProgressOut(BaseModel):
    id: int
    student_id: str
    domain_key: str
    spr_code: str
    level: int
    scored_by: str
    scored_at: datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────

def _verify_parent(id_token: str, db: Session) -> models.User:
    """Verify Firebase token and ensure the caller is a parent."""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    user = db.query(models.User).filter(models.User.id == decoded["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can perform this action")
    return user


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/add-child", response_model=StudentOut)
async def parent_add_child(request: ParentCreateChild, db: Session = Depends(get_db)):
    """Parent registers their child. No teacher or classroom yet."""
    parent = _verify_parent(request.id_token, db)

    student = models.Student(
        id=str(uuid.uuid4()),
        name=request.name,
        age=request.age,
        parent_id=parent.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/my-children", response_model=list[StudentOut])
async def parent_list_children(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List all children belonging to the authenticated parent."""
    parent = _verify_parent(request.id_token, db)
    children = db.query(models.Student).filter(models.Student.parent_id == parent.id).all()
    return children


@router.post("/{student_id}/delete")
async def parent_delete_child(student_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Parent removes their own child's record (only if not yet assigned to a teacher)."""
    parent = _verify_parent(request.id_token, db)
    student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.parent_id == parent.id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Child not found")
    if student.teacher_id:
        raise HTTPException(status_code=400, detail="Cannot remove a child already assigned to a teacher. Please contact the teacher.")

    db.delete(student)
    db.commit()
    return {"detail": "Child removed successfully"}


@router.post("/child-progress/{student_id}", response_model=list[StudentProgressOut])
async def parent_get_child_progress(student_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Parent views all SPR scores for their child."""
    parent = _verify_parent(request.id_token, db)

    student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.parent_id == parent.id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Child not found")

    scores = db.query(models.StudentProgress).filter(
        models.StudentProgress.student_id == student_id,
    ).all()
    return scores

