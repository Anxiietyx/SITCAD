import uuid
import models
from firebase_admin import auth as firebase_auth
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from dependencies import get_db

router = APIRouter(prefix="/lesson-plans", tags=["lesson-plans"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class AuthenticatedRequest(BaseModel):
    id_token: str

class CreateLessonPlanRequest(BaseModel):
    id_token: str
    title: str
    age_group: str
    learning_area: str
    duration_minutes: int
    topic: str
    additional_notes: Optional[str] = None
    objectives: Optional[list] = None
    materials: Optional[list] = None
    activities: Optional[list] = None
    assessment: Optional[str] = None
    adaptations: Optional[list] = None
    dskp_standards: Optional[list] = None
    teacher_notes: Optional[str] = None
    language: Optional[str] = None
    plan_type: Optional[str] = "subject"
    duration_weeks: Optional[int] = None
    unit_theme: Optional[str] = None
    weeks: Optional[list] = None
    image_style: Optional[str] = "cartoon"


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


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/save")
async def save_lesson_plan(request: CreateLessonPlanRequest, db: Session = Depends(get_db)):
    """Save a (possibly AI-generated and teacher-edited) lesson plan to the database."""
    teacher = _verify_teacher(request.id_token, db)

    plan = models.LessonPlan(
        id=str(uuid.uuid4()),
        teacher_id=teacher.id,
        title=request.title or f"{request.topic} Exploration",
        age_group=request.age_group,
        learning_area=request.learning_area,
        duration_minutes=request.duration_minutes,
        topic=request.topic,
        additional_notes=request.additional_notes,
        objectives=request.objectives or [],
        materials=request.materials or [],
        activities=request.activities or [],
        assessment=request.assessment or "",
        adaptations=request.adaptations or [],
        dskp_standards=request.dskp_standards or [],
        teacher_notes=request.teacher_notes or "",
        language=request.language,
        plan_type=request.plan_type or "subject",
        duration_weeks=request.duration_weeks,
        unit_theme=request.unit_theme,
        weeks=request.weeks,
        image_style=request.image_style or "cartoon",
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return _plan_to_dict(plan)


@router.post("/my-plans")
async def list_lesson_plans(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List all lesson plans for the authenticated teacher."""
    teacher = _verify_teacher(request.id_token, db)
    plans = (
        db.query(models.LessonPlan)
        .filter(models.LessonPlan.teacher_id == teacher.id)
        .order_by(models.LessonPlan.created_at.desc())
        .all()
    )
    return [_plan_to_dict(p) for p in plans]


@router.post("/{plan_id}")
async def get_lesson_plan(plan_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Get a single lesson plan by ID."""
    teacher = _verify_teacher(request.id_token, db)
    plan = db.query(models.LessonPlan).filter(
        models.LessonPlan.id == plan_id,
        models.LessonPlan.teacher_id == teacher.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    return _plan_to_dict(plan)


@router.post("/{plan_id}/delete")
async def delete_lesson_plan(plan_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Delete a lesson plan."""
    teacher = _verify_teacher(request.id_token, db)
    plan = db.query(models.LessonPlan).filter(
        models.LessonPlan.id == plan_id,
        models.LessonPlan.teacher_id == teacher.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    db.delete(plan)
    db.commit()
    return {"detail": "Lesson plan deleted"}


def _plan_to_dict(plan: models.LessonPlan) -> dict:
    return {
        "id": plan.id,
        "teacher_id": plan.teacher_id,
        "title": plan.title,
        "age_group": plan.age_group,
        "learning_area": plan.learning_area,
        "duration_minutes": plan.duration_minutes,
        "topic": plan.topic,
        "additional_notes": plan.additional_notes,
        "objectives": plan.objectives,
        "materials": plan.materials,
        "activities": plan.activities,
        "assessment": plan.assessment,
        "adaptations": plan.adaptations,
        "dskp_standards": plan.dskp_standards,
        "teacher_notes": plan.teacher_notes,
        "language": plan.language,
        "plan_type": plan.plan_type,
        "duration_weeks": plan.duration_weeks,
        "unit_theme": plan.unit_theme,
        "weeks": plan.weeks,
        "image_style": plan.image_style,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }
