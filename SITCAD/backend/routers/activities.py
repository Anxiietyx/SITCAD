import uuid
import io
import re
import zipfile
import asyncio
import logging
import models
from firebase_admin import auth as firebase_auth, storage as fb_storage
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from urllib.parse import unquote as _url_unquote
from dependencies import get_db

logger = logging.getLogger(__name__)

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
    activity_type: Optional[str] = None          # "quiz" | "image" | "story"
    generated_content: Optional[dict] = None     # AI-generated content
    assigned_to: str = "class"                 # "class" | "individual"
    student_ids: Optional[list[str]] = None    # required when assigned_to == "individual"
    lesson_plan_id: Optional[str] = None       # set when created from a lesson plan
    source: str = "lesson_plan"                # "lesson_plan"

class CompleteActivityRequest(BaseModel):
    id_token: str
    quiz_score: Optional[int] = None
    quiz_total: Optional[int] = None
    quiz_time_seconds: Optional[int] = None
    results_data: Optional[dict] = None          # Generic activity results for AI analysis


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
    students = []
    if student_ids:
        student_objs = db.query(models.Student).filter(models.Student.id.in_(student_ids)).all()
        students = [{"id": s.id, "name": s.name} for s in student_objs]

    # Fetch lesson plan title if the activity belongs to one
    lesson_plan_title = None
    if act.lesson_plan_id:
        lp = db.query(models.LessonPlan).filter(models.LessonPlan.id == act.lesson_plan_id).first()
        lesson_plan_title = lp.title if lp else None

    # Fetch latest AI insights if analysis is completed
    latest_insights = None
    if act.analysis_status == "completed":
        latest_report = (
            db.query(models.Report)
            .filter(models.Report.activity_id == act.id)
            .order_by(models.Report.created_at.desc())
            .first()
        )
        if latest_report and latest_report.details:
            latest_insights = latest_report.details.get("ai_insights")

    return {
        "id": act.id,
        "teacher_id": act.teacher_id,
        "lesson_plan_id": act.lesson_plan_id,
        "lesson_plan_title": lesson_plan_title,
        "source": act.source,
        "title": act.title,
        "description": act.description,
        "learning_area": act.learning_area,
        "duration_minutes": act.duration_minutes,
        "activity_type": act.activity_type,
        "generated_content": act.generated_content,
        "assigned_to": act.assigned_to,
        "status": act.status,
        "student_ids": student_ids,
        "students": students,
        "quiz_score": act.quiz_score,
        "quiz_total": act.quiz_total,
        "quiz_time_seconds": act.quiz_time_seconds,
        "results_data": act.results_data,
        "analysis_status": act.analysis_status,
        "analysis_error": act.analysis_error,
        "_latestInsights": latest_insights,
        "started_at": act.started_at.isoformat() if act.started_at else None,
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
        activity_type=request.activity_type,
        generated_content=request.generated_content,
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
    """List all activities for the authenticated teacher (excludes soft-deleted)."""
    teacher = _verify_teacher(request.id_token, db)
    activities = (
        db.query(models.Activity)
        .filter(
            models.Activity.teacher_id == teacher.id,
            models.Activity.is_deleted == False,
        )
        .order_by(models.Activity.created_at.desc())
        .all()
    )
    return [_activity_to_dict(a, db) for a in activities]


@router.post("/classroom-activities")
async def list_classroom_activities(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List activities assigned to the whole class (for classroom mode, excludes soft-deleted)."""
    teacher = _verify_teacher(request.id_token, db)
    activities = (
        db.query(models.Activity)
        .filter(
            models.Activity.teacher_id == teacher.id,
            models.Activity.assigned_to == "class",
            models.Activity.is_deleted == False,
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
    activity.started_at = datetime.now(timezone.utc)
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
    if request.results_data is not None:
        activity.results_data = request.results_data
    db.commit()
    db.refresh(activity)
    return _activity_to_dict(activity, db)


@router.post("/{activity_id}/delete")
async def delete_activity(activity_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Soft-delete an activity so it no longer appears in lists.
    Reports linked to the activity are preserved for AI analysis history."""
    teacher = _verify_teacher(request.id_token, db)
    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.teacher_id == teacher.id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity.is_deleted = True
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
        .filter(
            models.Activity.id.in_(activity_ids),
            models.Activity.is_deleted == False,
        )
        .order_by(models.Activity.created_at.desc())
        .all()
    )
    return [_activity_to_dict(a, db) for a in activities]


# ── Flashcard ZIP download ─────────────────────────────────────────

def _blob_name_from_storage_url(url: str) -> str | None:
    """Extract the GCS object path from a Firebase Storage URL.
    e.g. .../o/activity-images%2Fuuid.png?alt=media → activity-images/uuid.png
    """
    m = re.search(r"/o/([^?#]+)", url)
    return _url_unquote(m.group(1)) if m else None


def _build_flashcard_image(image_bytes: bytes, label: str) -> bytes:
    """
    Composite a flashcard: original image on top, white label bar below.
    Returns the final PNG as bytes.
    """
    from PIL import Image, ImageDraw, ImageFont

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    W, H = img.size

    # Label bar: 12% of image height, minimum 80 px
    bar_h = max(80, int(H * 0.12))
    font_size = max(24, int(bar_h * 0.52))

    # Try Comic Sans MS first, then fall back to other bold sans-serif fonts
    font = None
    for candidate in [
        "/usr/share/fonts/truetype/msttcorefonts/Comic_Sans_MS_Bold.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/comicbd.ttf",
        "/usr/share/fonts/msttcore/comicbd.ttf",
        "C:/Windows/Fonts/comicbd.ttf",
        "/Library/Fonts/Comic Sans MS Bold.ttf",
        "/System/Library/Fonts/Supplemental/Comic Sans MS Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:/Windows/Fonts/arialbd.ttf",
    ]:
        try:
            font = ImageFont.truetype(candidate, font_size)
            break
        except (IOError, OSError):
            continue
    if font is None:
        font = ImageFont.load_default()

    # Create composite canvas
    canvas = Image.new("RGB", (W, H + bar_h), (255, 255, 255))
    canvas.paste(img, (0, 0))

    draw = ImageDraw.Draw(canvas)

    # Measure text and centre it
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (W - text_w) // 2
    text_y = H + (bar_h - text_h) // 2 - bbox[1]

    draw.text((text_x, text_y), label, fill=(31, 41, 55), font=font)

    out = io.BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()


@router.post("/{activity_id}/download-flashcard-zip")
async def download_flashcard_zip(
    activity_id: str,
    request: AuthenticatedRequest,
    db: Session = Depends(get_db),
):
    """Build a ZIP of composite flashcard images (photo + label) server-side."""
    teacher = _verify_teacher(request.id_token, db)

    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.teacher_id == teacher.id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.activity_type != "image":
        raise HTTPException(status_code=400, detail="Not a flashcard activity")

    content = activity.generated_content or {}
    cards = content.get("images", [])
    if not cards:
        raise HTTPException(status_code=404, detail="No flashcard content found")

    bucket = fb_storage.bucket()
    loop = asyncio.get_event_loop()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, card in enumerate(cards):
            prefix = str(i + 1).zfill(2)
            label = card.get("label") or f"Card {i + 1}"
            safe = re.sub(r"[^a-zA-Z0-9]+", "_", label)[:40]

            image_url = card.get("image_url")
            if not image_url:
                logger.warning(f"Card {i+1} '{label}' has no image_url — skipping")
                continue

            blob_name = _blob_name_from_storage_url(image_url)
            if not blob_name:
                logger.warning(f"Could not extract blob path from URL: {image_url}")
                continue

            try:
                blob = bucket.blob(blob_name)
                image_bytes = await loop.run_in_executor(None, blob.download_as_bytes)
                composite = await loop.run_in_executor(
                    None, _build_flashcard_image, image_bytes, label
                )
                zf.writestr(f"{prefix}_{safe}.png", composite)
            except Exception as exc:
                logger.warning(f"Could not build flashcard image for '{label}': {exc}")

    zip_data = zip_buffer.getvalue()
    safe_title = re.sub(r"[^a-zA-Z0-9]+", "_", activity.title or "flashcards")[:50]
    return Response(
        content=zip_data,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}_flashcards.zip"'
        },
    )
