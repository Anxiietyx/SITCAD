import uuid
import models
from firebase_admin import auth as firebase_auth
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from dependencies import get_db

router = APIRouter(prefix="/reports", tags=["reports"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class AuthenticatedRequest(BaseModel):
    id_token: str

class CreateReportRequest(BaseModel):
    id_token: str
    activity_id: str
    title: Optional[str] = None
    summary: Optional[str] = None
    details: Optional[dict] = None
    score: Optional[int] = None
    total_questions: Optional[int] = None
    time_taken_seconds: Optional[int] = None


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
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = db.query(models.User).filter(models.User.id == decoded["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def _report_to_dict(report: models.Report, db: Session, for_student_ids: list[str] | None = None) -> dict:
    student_links = db.query(models.ReportStudent).filter(models.ReportStudent.report_id == report.id).all()
    student_ids = [rl.student_id for rl in student_links]

    # If for_student_ids is provided (e.g. parent's children), filter to only those students
    if for_student_ids is not None:
        student_ids = [sid for sid in student_ids if sid in for_student_ids]

    students = db.query(models.Student).filter(models.Student.id.in_(student_ids)).all() if student_ids else []

    # Get activity info
    activity = db.query(models.Activity).filter(models.Activity.id == report.activity_id).first()

    return {
        "id": report.id,
        "teacher_id": report.teacher_id,
        "activity_id": report.activity_id,
        "activity_title": activity.title if activity else None,
        "activity_description": activity.description if activity else None,
        "activity_learning_area": activity.learning_area if activity else None,
        "title": report.title,
        "summary": report.summary,
        "details": report.details,
        "students": [{"id": s.id, "name": s.name, "age": s.age, "classroom": s.classroom} for s in students],
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/generate")
async def generate_report(request: CreateReportRequest, db: Session = Depends(get_db)):
    """Generate a report for a completed activity."""
    teacher = _verify_teacher(request.id_token, db)

    activity = db.query(models.Activity).filter(
        models.Activity.id == request.activity_id,
        models.Activity.teacher_id == teacher.id,
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.status != "completed":
        raise HTTPException(status_code=400, detail="Activity must be completed before generating a report")

    # Get students linked to this activity
    student_links = db.query(models.ActivityStudent).filter(
        models.ActivityStudent.activity_id == activity.id
    ).all()
    student_ids = [sl.student_id for sl in student_links]
    students = db.query(models.Student).filter(models.Student.id.in_(student_ids)).all() if student_ids else []

    # Mock report content generation
    student_summaries = []

    # Compute performance inference from quiz data
    quiz_score = request.score
    quiz_total = request.total_questions
    quiz_time = request.time_taken_seconds
    score_pct = (quiz_score / quiz_total * 100) if quiz_score is not None and quiz_total else None
    time_per_q = (quiz_time / quiz_total) if quiz_time is not None and quiz_total else None

    def _infer_performance(pct, tpq):
        """Return (level, description) based on score % and avg seconds per question."""
        if pct is None:
            return ("N/A", "No quiz data available for this activity.")
        if pct >= 90:
            speed = "quickly" if tpq and tpq < 8 else "steadily"
            return ("Excellent", f"Achieved {pct:.0f}% accuracy and answered {speed}. Demonstrates strong mastery of the material.")
        if pct >= 70:
            speed = "at a good pace" if tpq and tpq < 10 else "with careful thought"
            return ("Good", f"Scored {pct:.0f}% accuracy {speed}. Shows solid understanding with room for reinforcement.")
        if pct >= 50:
            speed = "under time pressure" if tpq and tpq > 12 else ""
            extra = f" {speed}" if speed else ""
            return ("Developing", f"Scored {pct:.0f}% accuracy{extra}. Grasping foundational concepts; would benefit from additional practice.")
        speed = "and rushed through answers" if tpq and tpq < 5 else ""
        extra = f" {speed}" if speed else ""
        return ("Needs Support", f"Scored {pct:.0f}% accuracy{extra}. Requires targeted intervention and guided repetition.")

    perf_level, perf_description = _infer_performance(score_pct, time_per_q)

    for s in students:
        student_summaries.append({
            "student_id": s.id,
            "student_name": s.name,
            "participation": "Active",
            "performance_level": perf_level,
            "notes": f"{s.name}: {perf_description}",
        })

    title = request.title or f"Report: {activity.title}"

    # Build summary with quiz performance if available
    if score_pct is not None:
        time_str = ""
        if quiz_time is not None:
            mins = quiz_time // 60
            secs = quiz_time % 60
            time_str = f" completed in {mins}m {secs}s" if mins else f" completed in {secs}s"
        summary = request.summary or (
            f"Activity \"{activity.title}\" — Quiz score: {quiz_score}/{quiz_total} ({score_pct:.0f}%){time_str}. "
            f"Performance level: {perf_level}. {perf_description} "
            f"Conducted with {len(students)} student(s) covering {activity.learning_area or 'general'} skills."
        )
    else:
        summary = request.summary or (
            f"Activity \"{activity.title}\" was conducted successfully with {len(students)} student(s). "
            f"The activity covered {activity.learning_area or 'general'} skills "
            f"and lasted {activity.duration_minutes or 'N/A'} minutes."
        )

    details = request.details or {
        "activity_title": activity.title,
        "activity_description": activity.description,
        "learning_area": activity.learning_area,
        "duration_minutes": activity.duration_minutes,
        "assigned_to": activity.assigned_to,
        "student_count": len(students),
        "student_summaries": student_summaries,
        "completed_at": activity.completed_at.isoformat() if activity.completed_at else None,
        "quiz_score": quiz_score,
        "quiz_total": quiz_total,
        "quiz_time_seconds": quiz_time,
        "score_percentage": round(score_pct, 1) if score_pct is not None else None,
        "performance_level": perf_level,
        "performance_description": perf_description,
    }

    report = models.Report(
        id=str(uuid.uuid4()),
        teacher_id=teacher.id,
        activity_id=activity.id,
        title=title,
        summary=summary,
        details=details,
    )
    db.add(report)
    db.flush()

    for sid in student_ids:
        db.add(models.ReportStudent(report_id=report.id, student_id=sid))

    db.commit()
    db.refresh(report)
    return _report_to_dict(report, db)


@router.post("/my-reports")
async def list_reports(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List all reports for the authenticated teacher (excludes soft-deleted)."""
    teacher = _verify_teacher(request.id_token, db)
    reports = (
        db.query(models.Report)
        .filter(
            models.Report.teacher_id == teacher.id,
            models.Report.is_deleted == False,
        )
        .order_by(models.Report.created_at.desc())
        .all()
    )
    return [_report_to_dict(r, db) for r in reports]


@router.post("/{report_id}/delete")
async def delete_report(report_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """Soft-delete a report so it no longer appears in lists."""
    teacher = _verify_teacher(request.id_token, db)
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.teacher_id == teacher.id,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.is_deleted = True
    db.commit()
    return {"detail": "Report deleted"}


@router.post("/for-student/{student_id}")
async def list_reports_for_student(student_id: str, request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List reports involving a specific student (both teacher and parent)."""
    user = _verify_user(request.id_token, db)

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if user.role == "teacher" and student.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your student")
    if user.role == "parent" and student.parent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your child")

    report_ids = [
        row.report_id
        for row in db.query(models.ReportStudent).filter(models.ReportStudent.student_id == student_id).all()
    ]
    if not report_ids:
        return []

    reports = (
        db.query(models.Report)
        .filter(
            models.Report.id.in_(report_ids),
            models.Report.is_deleted == False,
        )
        .order_by(models.Report.created_at.desc())
        .all()
    )
    # Parents only see their own child in each report
    filter_ids = [student_id] if user.role == "parent" else None
    return [_report_to_dict(r, db, for_student_ids=filter_ids) for r in reports]


@router.post("/for-parent")
async def list_reports_for_parent(request: AuthenticatedRequest, db: Session = Depends(get_db)):
    """List all reports involving any children of the authenticated parent."""
    user = _verify_user(request.id_token, db)
    if user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can call this endpoint")

    children = db.query(models.Student).filter(models.Student.parent_id == user.id).all()
    child_ids = [c.id for c in children]
    if not child_ids:
        return []

    report_ids = [
        row.report_id
        for row in db.query(models.ReportStudent).filter(models.ReportStudent.student_id.in_(child_ids)).all()
    ]
    if not report_ids:
        return []

    reports = (
        db.query(models.Report)
        .filter(
            models.Report.id.in_(set(report_ids)),
            models.Report.is_deleted == False,
        )
        .order_by(models.Report.created_at.desc())
        .all()
    )
    # Parents only see their own children in each report
    return [_report_to_dict(r, db, for_student_ids=child_ids) for r in reports]
