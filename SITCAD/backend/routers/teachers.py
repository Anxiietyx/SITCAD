import models
from firebase_admin import auth as firebase_auth
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from dependencies import get_db

router = APIRouter(prefix="/teachers", tags=["teachers"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class AuthenticatedRequest(BaseModel):
    id_token: str

class TeacherAssignStudent(BaseModel):
    id_token: str
    student_id: str
    classroom: str

class TeacherUpdateStudent(BaseModel):
    id_token: str
    name: Optional[str] = None
    age: Optional[int] = None
    classroom: Optional[str] = None
    needs_intervention: Optional[bool] = None

class TeacherScoreStudent(BaseModel):
    id_token: str
    student_id: str
    domain_key: str
    spr_code: str
    level: int

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


# ── Helpers ───────────────────────────────────────────────────────

def _verify_teacher(id_token: str, db: Session) -> models.User:
    """Verify Firebase token and ensure the caller is a teacher."""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    user = db.query(models.User).filter(models.User.id == decoded["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can perform this action")
    return user


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/unassigned", response_model=list[StudentOut])
async def teacher_list_unassigned(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List students not yet assigned to any teacher (available to add)."""
    _verify_teacher(request.id_token, db)
    students = db.query(models.Student).filter(models.Student.teacher_id.is_(None)).all()
    return students


@router.post("/assign", response_model=StudentOut)
async def teacher_assign_student(request: TeacherAssignStudent, db: Session = Depends(get_db)):
    """Teacher assigns an unassigned student to their classroom."""
    teacher = _verify_teacher(request.id_token, db)

    student = db.query(models.Student).filter(models.Student.id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.teacher_id:
        raise HTTPException(status_code=400, detail="Student is already assigned to a teacher")

    student.teacher_id = teacher.id
    student.classroom = request.classroom
    db.commit()
    db.refresh(student)
    return student


@router.post("/my-students", response_model=list[StudentOut])
async def teacher_list_students(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List all students assigned to the authenticated teacher."""
    teacher = _verify_teacher(request.id_token, db)
    students = db.query(models.Student).filter(models.Student.teacher_id == teacher.id).all()
    return students


@router.put("/{student_id}", response_model=StudentOut)
async def teacher_update_student(student_id: str, request: TeacherUpdateStudent, db: Session = Depends(get_db)):
    """Teacher updates details for one of their students."""
    teacher = _verify_teacher(request.id_token, db)
    student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.teacher_id == teacher.id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for field in ["name", "age", "classroom", "needs_intervention"]:
        value = getattr(request, field, None)
        if value is not None:
            setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


@router.post("/score", response_model=StudentProgressOut)
async def teacher_score_student(request: TeacherScoreStudent, db: Session = Depends(get_db)):
    """Teacher assigns or updates a Standard Prestasi level for a student."""
    teacher = _verify_teacher(request.id_token, db)

    if request.level not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Level must be 1, 2, or 3")

    student = db.query(models.Student).filter(
        models.Student.id == request.student_id,
        models.Student.teacher_id == teacher.id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")

    # Upsert: update if exists, create if not
    progress = db.query(models.StudentProgress).filter(
        models.StudentProgress.student_id == request.student_id,
        models.StudentProgress.domain_key == request.domain_key,
        models.StudentProgress.spr_code == request.spr_code,
    ).first()

    if progress:
        progress.level = request.level
        progress.scored_by = teacher.id
        progress.scored_at = datetime.now()
    else:
        progress = models.StudentProgress(
            student_id=request.student_id,
            domain_key=request.domain_key,
            spr_code=request.spr_code,
            level=request.level,
            scored_by=teacher.id,
        )
        db.add(progress)

    db.commit()
    db.refresh(progress)
    return progress


@router.post("/student-progress/{student_id}", response_model=list[StudentProgressOut])
async def teacher_get_student_progress(student_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Get all SPR scores for a student assigned to the teacher."""
    teacher = _verify_teacher(request.id_token, db)

    student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.teacher_id == teacher.id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")

    scores = db.query(models.StudentProgress).filter(
        models.StudentProgress.student_id == student_id,
    ).all()
    return scores


@router.post("/{student_id}/unassign")
async def teacher_unassign_student(student_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Teacher removes a student from their classroom (student goes back to unassigned)."""
    teacher = _verify_teacher(request.id_token, db)
    student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.teacher_id == teacher.id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.teacher_id = None
    student.classroom = None
    db.commit()
    return {"detail": "Student removed from classroom"}
