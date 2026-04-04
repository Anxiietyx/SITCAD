import os
import json
import time
import logging
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

import models
from dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-integrations", tags=["ai-integrations"])

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"

# ---------------------------------------------------------------------------
# Curriculum loader
# ---------------------------------------------------------------------------

CURRICULUM_DIR = Path(__file__).parent.parent / "data" / "curriculum"

# Map frontend learningArea values → relevant DSKP JSON files
AREA_TO_FILES: dict[str, list[str]] = {
    "literacy_bm": ["lang_and_lit_malay.json"],
    "literacy_en": ["lang_and_lit_english.json"],
    "numeracy":    ["kognitif.json"],
    "social":      ["sosioemosi.json", "knw_pendidikan_kewarganegaraan.json"],
    "motor":       ["fizikal_dan_kemahiran.json"],
    "creative":    ["kreativiti_dan_estetika.json"],
    "cognitive":   ["kognitif.json", "sosioemosi.json"],
}


def _load_curriculum_files(file_names: list[str]) -> list[dict]:
    """Load and parse DSKP JSON files."""
    loaded = []
    for fname in file_names:
        fpath = CURRICULUM_DIR / fname
        if fpath.exists():
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    loaded.append(json.load(f))
            except Exception as e:
                logger.warning(f"Could not load curriculum file {fname}: {e}")
    return loaded


def _build_dskp_context(learning_area: str, moral_education: str = "moral") -> str:
    """
    Build a compact DSKP context string for the system prompt.
    `moral_education` is only applied when `learning_area == "social"`, selecting between
    "moral" (Pendidikan Moral) and "islam" (Pendidikan Islam).
    """
    primary_files = list(AREA_TO_FILES.get(learning_area, AREA_TO_FILES["cognitive"]))

    # Only inject moral/spiritual education file for Social Skills
    if learning_area == "social":
        moral_file = "knw_pendidikan_islam.json" if moral_education == "islam" else "knw_pendidikan_moral.json"
        if moral_file not in primary_files:
            primary_files.append(moral_file)

    curriculum_data = _load_curriculum_files(primary_files)

    if not curriculum_data:
        return "No specific DSKP data available; use general KSPK principles."

    lines: list[str] = ["=== DSKP KSPK Semakan 2026 — Relevant Curriculum Standards ==="]

    for domain in curriculum_data:
        overview = domain.get("overview", {})
        domain_name = overview.get("domain", "Unknown Domain")
        lines.append(f"\n## {domain_name}")

        for kn in domain.get("domain_content", []):
            kn_title = kn.get("kn_title", "")
            lines.append(f"\n### {kn.get('kn_code', '')} — {kn_title}")
            for sk in kn.get("kn_component_sks", []):
                sk_code = sk.get("sk_code", "")
                sk_title = sk.get("sk_title", "")
                lines.append(f"  [{sk_code}] {sk_title}")
                for spe in sk.get("sk_component_spes", [])[:3]:
                    spe_code = spe.get("spe_code", "")
                    spe_title = spe.get("spe_title", "")
                    lines.append(f"    • ({spe_code}) {spe_title}")

        pm = domain.get("performance_metrics", [])
        if pm:
            lines.append("\n  Performance Standards (SPR):")
            for spr in pm[:4]:
                lines.append(f"    [{spr.get('spr_code','')}] {spr.get('spr_title','')}")
                for rubric in spr.get("spr_rubric", []):
                    lines.append(f"      Level {rubric['level']}: {rubric['explanation']}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_json_fences(raw: str) -> str:
    """Strip markdown code fences the model may add."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[: raw.rfind("```")].strip()
    return raw


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


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

LearningArea = Literal[
    "literacy_bm", "literacy_en", "numeracy", "social", "motor", "creative", "cognitive"
]

MoralEducation = Literal["moral", "islam"]


class GenerateLessonRequest(BaseModel):
    id_token: str
    topic: str = Field(..., min_length=3)
    age_group: str = Field(default="5")
    learning_area: LearningArea = Field(default="literacy_bm")
    duration: int = Field(default=30, ge=10, le=120)
    additional_notes: str = Field(default="")
    moral_education: MoralEducation = Field(default="moral")
    language: Literal["bm", "en"] = Field(default="bm")


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_TEMPLATE = """\
You are SabahSprout AI, an expert Malaysian kindergarten teacher and curriculum specialist.
You help teachers design lesson plans that are:
  1. Perfectly aligned with the DSKP KSPK Semakan 2026 curriculum.
  2. Developmentally appropriate for children aged {age_group} years.
  3. Engaging, playful, and culturally relevant to Sabah, Malaysia.
  4. Practical and achievable within the given time limit.

CRITICAL RULES:
- The lesson plan must be written in {language_label}. DSKP standard codes remain in their original form.
- Always cite specific DSKP standard codes (e.g. BM 1.1.2, KF 2.3.1, PM 1.1) in the dskp_standards array. Each entry must be an object with "code" (the SPE code) and "title" (the SPE title from the DSKP document).
- Every objective must map to at least one DSKP standard.
- This system generates content end-to-end from lesson plan to activities. Assume all activities are delivered digitally on-screen — do NOT include physical materials. The "materials" array should list digital resources, on-screen assets, or media used in the activities.
- Activities represent the individual learning activities this lesson plan comprises. Each activity should have a clear title, a detailed description of what happens, and an estimated duration. Activities should fit within the time budget of {duration} minutes.
- Use Bahasa Melayu terminology for DSKP references when appropriate (you can add English in parentheses).
- Adaptations must address diverse learners: visual, kinesthetic, EAL children, and children needing extra support.
- Your entire response MUST be a single valid JSON object following this exact schema:

{{
  "title": "<engaging lesson title>",
  "dskp_standards": [
    {{"code": "<SPE code>", "title": "<SPE title>"}},
    ...
  ],
  "objectives": ["<objective1>", "<objective2>", ...],
  "materials": ["<digital resource 1>", "<on-screen asset 2>", ...],
  "activities": [
    {{
      "title": "<activity name>",
      "description": "<detailed description of what happens in this activity>",
      "duration": "<X minutes>"
    }}
  ],
  "assessment": "<assessment strategy>",
  "adaptations": ["<adaptation1>", "<adaptation2>", ...],
  "teacher_notes": "<any important notes for the teacher>"
}}

Do NOT wrap the JSON in markdown code fences. Return raw JSON only.

{dskp_context}
"""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/health")
async def ai_health_check():
    """Verify Gemini API key is configured and connectivity works."""
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not set.")
    try:
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            api_key=gemini_api_key,
            temperature=0,
            max_tokens=64,
        )
        response = await llm.ainvoke([HumanMessage(content="Reply with this phrase: Hello there.")])
        # Gemini 3.1 Flash Lite returns a list of content-block dicts; 2.5 Flash returns a string
        content = response.content
        if isinstance(content, list):
            content = "".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in content)
        return {"status": "ok", "model": GEMINI_MODEL, "echo": str(content).strip()}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini connectivity error: {str(exc)}")


@router.post("/generate-lesson")
async def generate_lesson(request: GenerateLessonRequest, db: Session = Depends(get_db)):
    """
    Generate a DSKP-aligned kindergarten lesson plan using Gemini.

    Flow:
      1. Validate teacher auth.
      2. Build DSKP context from curriculum JSON files (P-B).
      3. Combine with teacher inputs (P-A) into a Gemini prompt.
      4. Parse the structured JSON response.
      5. Return the lesson plan (NOT saved yet — teacher reviews first).
    """
    teacher = _verify_teacher(request.id_token, db)

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")

    # Build DSKP context (P-B)
    dskp_context = _build_dskp_context(request.learning_area, request.moral_education)

    language_label = "English" if request.language == "en" else "Bahasa Malaysia"

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        age_group=request.age_group,
        duration=request.duration,
        language_label=language_label,
        dskp_context=dskp_context,
    )

    user_message = (
        f"Generate a lesson plan for the topic: '{request.topic}'.\n"
        f"Learning area: {request.learning_area}.\n"
        f"Duration: {request.duration} minutes.\n"
        f"Age group: {request.age_group} years old.\n"
        f"Language of delivery: {'English' if request.language == 'en' else 'Bahasa Malaysia'}.\n"
    )
    if request.learning_area == "social":
        user_message += f"Moral/spiritual education stream: {request.moral_education}.\n"
    if request.additional_notes.strip():
        user_message += f"Additional teacher notes: {request.additional_notes}\n"

    try:
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            api_key=gemini_api_key,
            temperature=0.7,
            max_tokens=4096,
        )
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ])
        content = response.content
        if isinstance(content, list):
            content = "".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in content)
        raw_text = str(content).strip()
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    raw_text = _strip_json_fences(raw_text)

    try:
        lesson_data = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON: {e}\nRaw: {raw_text[:500]}")
        raise HTTPException(status_code=500, detail="AI returned an invalid response. Please try again.")

    # Normalise and return — NOT saved to DB yet (teacher reviews first)
    return {
        "title": lesson_data.get("title", f"{request.topic} Exploration"),
        "age_group": request.age_group,
        "learning_area": request.learning_area,
        "duration_minutes": request.duration,
        "topic": request.topic,
        "additional_notes": request.additional_notes,
        "moral_education": request.moral_education,
        "language": request.language,
        "dskp_standards": lesson_data.get("dskp_standards", []),
        "objectives": lesson_data.get("objectives", []),
        "materials": lesson_data.get("materials", []),
        "activities": lesson_data.get("activities", []),
        "assessment": lesson_data.get("assessment", ""),
        "adaptations": lesson_data.get("adaptations", []),
        "teacher_notes": lesson_data.get("teacher_notes", ""),
    }
        