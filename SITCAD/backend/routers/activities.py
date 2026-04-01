import uuid
import models
from firebase_admin import auth as firebase_auth
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from dependencies import get_db

router = APIRouter(prefix="/activities", tags=["activities"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class AuthenticatedRequest(BaseModel):
    id_token: str

class CreateActivityRequest(BaseModel):
    id_token: str
    title: str
    description: Optional[str] = None
    learning_area: Optional[str] = None
    duration_minutes: Optional[int] = None
    assigned_to: str = "class"                 # "class" | "individual"
    student_ids: Optional[list[str]] = None    # required when assigned_to == "individual"
    lesson_plan_id: Optional[str] = None       # set when created from a lesson plan
    source: str = "manual"                     # "manual" | "lesson_plan"

class CompleteActivityRequest(BaseModel):
    id_token: str
    quiz_score: Optional[int] = None
    quiz_total: Optional[int] = None
    quiz_time_seconds: Optional[int] = None


# ── Helpers ───────────────────────────────────────────────────────

def _verify_teacher(id_token: str, db: Session) -> models.User:
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

def _verify_user(id_token: str, db: Session) -> models.User:
    """Verify any authenticated user (teacher or parent)."""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = db.query(models.User).filter(models.User.id == decoded["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def _activity_to_dict(act: models.Activity, db: Session) -> dict:
    student_ids = [
        row.student_id
        for row in db.query(models.ActivityStudent).filter(models.ActivityStudent.activity_id == act.id).all()
    ]
    student_names = []
    if student_ids:
        students = db.query(models.Student).filter(models.Student.id.in_(student_ids)).all()
        student_names = [s.name for s in students]

    return {
        "id": act.id,
        "teacher_id": act.teacher_id,
        "lesson_plan_id": act.lesson_plan_id,
        "source": act.source,
        "title": act.title,
        "description": act.description,
        "learning_area": act.learning_area,
        "duration_minutes": act.duration_minutes,
        "assigned_to": act.assigned_to,
        "status": act.status,
        "student_ids": student_ids,
        "student_names": student_names,
        "quiz_score": act.quiz_score,
        "quiz_total": act.quiz_total,
        "quiz_time_seconds": act.quiz_time_seconds,
        "created_at": act.created_at.isoformat() if act.created_at else None,
        "completed_at": act.completed_at.isoformat() if act.completed_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/create")
async def create_activity(request: CreateActivityRequest, db: Session = Depends(get_db)):
    """Create a new activity (manual or from lesson plan)."""
    teacher = _verify_teacher(request.id_token, db)

    # Validate lesson plan reference
    if request.source == "lesson_plan" and request.lesson_plan_id:
        plan = db.query(models.LessonPlan).filter(
            models.LessonPlan.id == request.lesson_plan_id,
            models.LessonPlan.teacher_id == teacher.id,
        ).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Lesson plan not found")

    activity = models.Activity(
        id=str(uuid.uuid4()),
        teacher_id=teacher.id,
        lesson_plan_id=request.lesson_plan_id,
        source=request.source,
        title=request.title,
        description=request.description,
        learning_area=request.learning_area,
        duration_minutes=request.duration_minutes,
        assigned_to=request.assigned_to,
        status="pending",
    )
    db.add(activity)
    db.flush()

    # If individual, link specific students
    if request.assigned_to == "individual" and request.student_ids:
        for sid in request.student_ids:
            db.add(models.ActivityStudent(activity_id=activity.id, student_id=sid))
    elif request.assigned_to == "class":
        # Assign to all students of this teacher
        students = db.query(models.Student).filter(models.Student.teacher_id == teacher.id).all()
        for s in students:
            db.add(models.ActivityStudent(activity_id=activity.id, student_id=s.id))

    db.commit()
    db.refresh(activity)
    return _activity_to_dict(activity, db)


@router.post("/my-activities")
async def list_activities(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List all activities for the authenticated teacher."""
    teacher = _verify_teacher(request.id_token, db)
    activities = (
        db.query(models.Activity)
        .filter(models.Activity.teacher_id == teacher.id)
        .order_by(models.Activity.created_at.desc())
        .all()
    )
    return [_activity_to_dict(a, db) for a in activities]


@router.post("/classroom-activities")
async def list_classroom_activities(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List activities assigned to the whole class (for classroom mode)."""
    teacher = _verify_teacher(request.id_token, db)
    activities = (
        db.query(models.Activity)
        .filter(
            models.Activity.teacher_id == teacher.id,
            models.Activity.assigned_to == "class",
        )
        .order_by(models.Activity.created_at.desc())
        .all()
    )
    return [_activity_to_dict(a, db) for a in activities]


@router.post("/{activity_id}/start")
async def start_activity(activity_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Mark an activity as in_progress."""
    teacher = _verify_teacher(request.id_token, db)
    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.teacher_id == teacher.id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity.status = "in_progress"
    db.commit()
    db.refresh(activity)
    return _activity_to_dict(activity, db)


@router.post("/{activity_id}/complete")
async def complete_activity(activity_id: str, request: CompleteActivityRequest, db: Session = Depends(get_db)):
    """Mark an activity as completed, optionally saving quiz results."""
    teacher = _verify_teacher(request.id_token, db)
    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.teacher_id == teacher.id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity.status = "completed"
    activity.completed_at = datetime.now(timezone.utc)
    if request.quiz_score is not None:
        activity.quiz_score = request.quiz_score
    if request.quiz_total is not None:
        activity.quiz_total = request.quiz_total
    if request.quiz_time_seconds is not None:
        activity.quiz_time_seconds = request.quiz_time_seconds
    db.commit()
    db.refresh(activity)
    return _activity_to_dict(activity, db)


@router.post("/{activity_id}/delete")
async def delete_activity(activity_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Delete an activity and its student links."""
    teacher = _verify_teacher(request.id_token, db)
    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.teacher_id == teacher.id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.query(models.ActivityStudent).filter(models.ActivityStudent.activity_id == activity_id).delete()
    db.delete(activity)
    db.commit()
    return {"detail": "Activity deleted"}


@router.post("/for-student/{student_id}")
async def list_activities_for_student(student_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List activities for a specific student (both teacher and parent can call)."""
    user = _verify_user(request.id_token, db)

    # Verify access: teacher must own the student, parent must be the parent
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if user.role == "teacher" and student.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your student")
    if user.role == "parent" and student.parent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your child")

    activity_ids = [
        row.activity_id
        for row in db.query(models.ActivityStudent).filter(models.ActivityStudent.student_id == student_id).all()
    ]
    if not activity_ids:
        return []

    activities = (
        db.query(models.Activity)
        .filter(models.Activity.id.in_(activity_ids))
        .order_by(models.Activity.created_at.desc())
        .all()
    )
    return [_activity_to_dict(a, db) for a in activities]
