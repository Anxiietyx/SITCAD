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

@router.post("/generate")
async def generate_lesson_plan(request: CreateLessonPlanRequest, db: Session = Depends(get_db)):
    """Generate a mock lesson plan (placeholder for future AI) and save it."""
    teacher = _verify_teacher(request.id_token, db)

    # Mock AI generation — produces structured content based on inputs
    objectives = request.objectives or [
        f"Introduce basic concepts of {request.topic}",
        "Develop fine motor skills through hands-on activities",
        "Encourage verbal expression and communication",
        "Foster curiosity and exploration",
    ]
    materials = request.materials or [
        "Visual aids and picture cards",
        "Hands-on manipulatives",
        "Art supplies (crayons, paper, scissors)",
        "Interactive storybooks",
        "Music player for transitions",
    ]
    activities = request.activities or [
        {"step": 1, "title": "Circle Time Introduction",
         "description": f"Gather students in a circle and introduce the topic of {request.topic}. Use visual aids and encourage students to share what they know.",
         "duration": "5-7 minutes"},
        {"step": 2, "title": "Interactive Story",
         "description": f"Read an engaging story related to {request.topic}. Pause to ask questions and encourage predictions.",
         "duration": "8-10 minutes"},
        {"step": 3, "title": "Hands-On Activity",
         "description": f"Students explore {request.topic} through a structured activity with manipulatives. Teacher circulates to provide support.",
         "duration": "10-12 minutes"},
        {"step": 4, "title": "Creative Expression",
         "description": "Students create artwork or crafts related to the lesson topic, reinforcing concepts learned.",
         "duration": "8-10 minutes"},
        {"step": 5, "title": "Closing & Review",
         "description": "Gather students to review what they learned. Sing a related song and preview upcoming activities.",
         "duration": "3-5 minutes"},
    ]
    assessment = request.assessment or (
        "Observe student participation, listen to verbal responses, and review completed activities. "
        "Note students who may need additional support or enrichment."
    )
    adaptations = request.adaptations or [
        "For visual learners: Provide extra visual supports and diagrams",
        "For kinesthetic learners: Include more movement-based activities",
        "For advanced students: Offer extension activities with increased complexity",
        "For students needing support: Provide one-on-one assistance and simplified instructions",
        "For English language learners: Use visual cues and gestures to support understanding",
    ]

    plan = models.LessonPlan(
        id=str(uuid.uuid4()),
        teacher_id=teacher.id,
        title=request.title or f"{request.topic} Exploration",
        age_group=request.age_group,
        learning_area=request.learning_area,
        duration_minutes=request.duration_minutes,
        topic=request.topic,
        additional_notes=request.additional_notes,
        objectives=objectives,
        materials=materials,
        activities=activities,
        assessment=assessment,
        adaptations=adaptations,
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
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }
