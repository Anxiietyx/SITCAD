from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Date, UniqueConstraint, Text, JSON
from datetime import datetime, timezone, date
from database import Base

class User(Base):
  __tablename__ = "users"
  
  """
  1. 'id' in this case refers to the User UID created on the Firebase side, we use this as the unique identifier.
  2. role is nullable for new users who haven't finished onboarding.
  """
  id = Column(String, primary_key=True, index=True)
  email = Column(String, unique=True, index=True)
  full_name = Column(String)
  role = Column(String, nullable=True)
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Student(Base):
  __tablename__ = "students"

  id = Column(String, primary_key=True, index=True)
  name = Column(String, nullable=False)
  age = Column(Integer, nullable=False)
  classroom = Column(String, nullable=True)
  parent_id = Column(String, ForeignKey("users.id"), nullable=False)
  teacher_id = Column(String, ForeignKey("users.id"), nullable=True)
  enrollment_date = Column(Date, default=lambda: date.today())
  needs_intervention = Column(Boolean, default=False)
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class StudentProgress(Base):
  __tablename__ = "student_progress"
  __table_args__ = (
    UniqueConstraint("student_id", "domain_key", "spr_code", name="uq_student_domain_spr"),
  )

  id = Column(Integer, primary_key=True, autoincrement=True)
  student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
  domain_key = Column(String, nullable=False)
  spr_code = Column(String, nullable=False)
  level = Column(Integer, nullable=False)
  scored_by = Column(String, ForeignKey("users.id"), nullable=False)
  scored_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class LessonPlan(Base):
  __tablename__ = "lesson_plans"

  id = Column(String, primary_key=True, index=True)
  teacher_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
  title = Column(String, nullable=False)
  age_group = Column(String, nullable=False)
  learning_area = Column(String, nullable=False)
  duration_minutes = Column(Integer, nullable=False)
  topic = Column(String, nullable=False)
  additional_notes = Column(Text, nullable=True)
  objectives = Column(JSON, nullable=True)
  materials = Column(JSON, nullable=True)
  activities = Column(JSON, nullable=True)       # [{step, title, description, duration}]
  assessment = Column(Text, nullable=True)
  adaptations = Column(JSON, nullable=True)
  dskp_standards = Column(JSON, nullable=True)   # ["BM 1.1.2", "KO 2.3.1", ...]
  teacher_notes = Column(Text, nullable=True)
  language = Column(String, nullable=True)          # "bm" or "en"
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Activity(Base):
  __tablename__ = "activities"

  id = Column(String, primary_key=True, index=True)
  teacher_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
  lesson_plan_id = Column(String, ForeignKey("lesson_plans.id"), nullable=True)
  source = Column(String, nullable=False, default="lesson_plan")  # "lesson_plan"
  title = Column(String, nullable=False)
  description = Column(Text, nullable=True)
  learning_area = Column(String, nullable=True)
  duration_minutes = Column(Integer, nullable=True)
  activity_type = Column(String, nullable=True)                   # "quiz" | "image" | "story"
  generated_content = Column(JSON, nullable=True)                 # AI-generated content
  assigned_to = Column(String, nullable=False, default="class")  # "class" | "individual"
  status = Column(String, nullable=False, default="pending")     # "pending" | "in_progress" | "completed"
  quiz_score = Column(Integer, nullable=True)
  quiz_total = Column(Integer, nullable=True)
  quiz_time_seconds = Column(Integer, nullable=True)
  results_data = Column(JSON, nullable=True)                     # Activity results for AI analysis
  analysis_status = Column(String, nullable=True)                 # null | "pending" | "analyzing" | "completed" | "failed"
  analysis_error = Column(Text, nullable=True)
  started_at = Column(DateTime, nullable=True)
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
  completed_at = Column(DateTime, nullable=True)


class ActivityStudent(Base):
  __tablename__ = "activity_students"

  id = Column(Integer, primary_key=True, autoincrement=True)
  activity_id = Column(String, ForeignKey("activities.id"), nullable=False, index=True)
  student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)


class Report(Base):
  __tablename__ = "reports"

  id = Column(String, primary_key=True, index=True)
  teacher_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
  activity_id = Column(String, ForeignKey("activities.id"), nullable=False)
  title = Column(String, nullable=False)
  summary = Column(Text, nullable=True)
  details = Column(JSON, nullable=True)
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ReportStudent(Base):
  __tablename__ = "report_students"

  id = Column(Integer, primary_key=True, autoincrement=True)
  report_id = Column(String, ForeignKey("reports.id"), nullable=False, index=True)
  student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)


class InterventionAnalysis(Base):
  """
  Stores the complete AI intervention analysis for a student.
  Created automatically after each activity analysis, or on-demand.
  Contains: overall_summary, improvement tracking, school readiness, inclinations.
  """
  __tablename__ = "intervention_analyses"

  id = Column(String, primary_key=True, index=True)
  teacher_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
  student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
  trigger_report_id = Column(String, ForeignKey("reports.id"), nullable=True)  # report that triggered this
  overall_summary = Column(Text, nullable=True)
  improvement_data = Column(JSON, nullable=True)       # {trend, details, comparison data}
  school_readiness = Column(JSON, nullable=True)        # {ready, assessment, areas, recommendations}
  inclinations = Column(JSON, nullable=True)            # [{area, observation, suggestion}]
  source_report_ids = Column(JSON, nullable=True)       # all report IDs used in analysis
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Intervention(Base):
  __tablename__ = "interventions"

  id = Column(String, primary_key=True, index=True)
  teacher_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
  student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
  analysis_id = Column(String, ForeignKey("intervention_analyses.id"), nullable=True, index=True)
  priority = Column(String, nullable=False, default="medium")           # "high" | "medium" | "low"
  status = Column(String, nullable=False, default="pending")            # "pending" | "in_progress" | "resolved"
  area = Column(String, nullable=False)                                  # learning area or developmental area
  concern = Column(Text, nullable=False)
  recommended_actions = Column(JSON, nullable=True)                      # list of action strings
  inclinations = Column(JSON, nullable=True)                             # list of strength/inclination observations
  source_report_ids = Column(JSON, nullable=True)                        # list of report IDs that informed this
  ai_reasoning = Column(Text, nullable=True)                             # AI's justification
  resolved_at = Column(DateTime, nullable=True)
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
  updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Message(Base):
  __tablename__ = "messages"

  id = Column(String, primary_key=True, index=True)
  sender_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
  recipient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
  subject = Column(String, nullable=False)
  body = Column(Text, nullable=False)
  read = Column(Boolean, default=False)
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
  