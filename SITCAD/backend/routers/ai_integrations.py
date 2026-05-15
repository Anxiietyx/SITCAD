import os
import json
import time
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import quote as _url_quote

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from firebase_admin import auth as firebase_auth
from google import genai
from google.genai import types

import models
from dependencies import get_db

# ---------------------------------------------------------------------------
# CONFIGURATION CONSTANTS
# ---------------------------------------------------------------------------

PROJECT_ID = os.getenv("PROJECT_ID")
TEXT_LOCATION = os.getenv("TEXT_LOCATION")
IMAGE_LOCATION = os.getenv("IMAGE_LOCATION")
GEMINI_MODEL = "gemini-3.1-flash-lite"
IMAGEN_MODEL = "imagen-4.0-fast-generate-001"

# ---------------------------------------------------------------------------
# INITIALISE THE UNIFIED CLIENT, LOGGER AND ROUTER
# ---------------------------------------------------------------------------

client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=TEXT_LOCATION
)
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-integrations", tags=["ai-integrations"])

# ---------------------------------------------------------------------------
# CURRICULUM LOADER
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
# HELPERS
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


def _is_503_error(exc: Exception) -> bool:
    """Return True if the exception is a transient 503/UNAVAILABLE error from Gemini."""
    err = str(exc)
    return "503" in err or "UNAVAILABLE" in err or "high demand" in err.lower()


def _convert_messages_to_genai(messages: list) -> list[types.Content]:
    """
    Convert langchain-style objects or dicts to the new SDK's Content format.
    Ensures roles are strictly 'user' or 'model'.
    """
    genai_messages = []
    for msg in messages:
        if hasattr(msg, 'content') and hasattr(msg, '__class__'):
            # Langchain message object
            msg_type = msg.__class__.__name__
            # Gemini strictly uses 'model', Langchain often uses 'AIMessage'
            role = "user" if msg_type == "HumanMessage" else "model"
            text = msg.content
        elif isinstance(msg, dict):
            # Already a dict - normalize roles
            role = msg.get('role', 'user')
            if role in ["assistant", "ai", "model"]:
                role = "model"
            text = msg.get('text', msg.get('content', ''))
        else:
            # Fallback for raw strings
            role = "user"
            text = str(msg)
        
        # New SDK uses types.Content and types.Part
        genai_messages.append(
            types.Content(
                role=role, 
                parts=[types.Part.from_text(text=text)]
            )
        )
    return genai_messages


async def _invoke_with_retry(
    messages: list, 
    system_instruction: str = None,  # Add this
    max_retries: int = 3, 
    base_delay: float = 5.0,
    temperature: float = 0.7,
    max_output_tokens: int = 4096,
):
    last_exc: Exception | None = None
    genai_messages = _convert_messages_to_genai(messages)
    
    # CRITICAL: Added response_mime_type and system_instruction
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json"  # Forces raw JSON (no fences)
    )

    for attempt in range(max_retries):
        try:
            return await client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=genai_messages,
                config=config
            )
        except Exception as exc:
            if _is_503_error(exc):
                last_exc = exc
                delay = base_delay * (2 ** attempt)
                await asyncio.sleep(delay)
            else:
                raise  
    raise last_exc


def _generate_fallback_insights(
    activity: "models.Activity",
    results: dict,
    students: list,
    dskp_standards: list,
) -> dict:
    """
    Build a basic rule-based analysis report when Gemini is unavailable.
    Marks the report with ``_fallback: True`` so the frontend can surface a notice.
    """
    act_type = results.get("activity_type", activity.activity_type or "quiz")
    strengths: list[str] = []
    areas: list[str] = []
    interventions: list[dict] = []

    if act_type == "quiz":
        total = results.get("total", 0)
        first_correct = results.get("first_attempt_correct", 0)
        pct = round(first_correct / total * 100) if total else 0
        summary = (
            f"The student(s) completed the quiz with {first_correct}/{total} correct on first attempt "
            f"({pct}%). "
        )
        if pct >= 80:
            summary += "Overall performance was strong."
            strengths.append("Strong overall comprehension demonstrated.")
        elif pct >= 60:
            summary += "Performance was satisfactory with room for improvement."
        else:
            summary += "Performance suggests some concepts may need reinforcement."
            areas.append("Core concepts may benefit from additional practice.")

        per_q: list[dict] = results.get("per_question", [])
        slow = [i + 1 for i, q in enumerate(per_q) if q.get("time_taken", 0) > 30]
        if slow:
            areas.append(f"Question(s) {slow} took longer than expected — consider revisiting.")
            interventions.append({
                "type": "slow_response",
                "detail": f"Question(s) {slow} exceeded 30 seconds.",
                "severity": "flag",
            })
        multi_retry = [i + 1 for i, q in enumerate(per_q) if q.get("retries", 0) > 1]
        if multi_retry:
            areas.append(f"Question(s) {multi_retry} required multiple attempts.")
            interventions.append({
                "type": "many_retries",
                "detail": f"Question(s) {multi_retry} needed more than one retry.",
                "severity": "flag",
            })
    else:
        time_s = results.get("time_seconds", 0)
        summary = f"Activity completed in {time_s} seconds."
        strengths.append("Activity completed successfully.")

    if not strengths:
        strengths.append("Activity completed successfully.")
    if not areas:
        areas.append("Re-run AI analysis for personalised recommendations.")

    return {
        "summary": (
            summary
            + " (Note: Full AI insights are temporarily unavailable due to high demand. "
            "Retry analysis when the service recovers for deeper recommendations.)"
        ),
        "spr_attainment": [],
        "interventions": interventions,
        "strengths": strengths,
        "areas_for_improvement": areas,
        "recommendations": [
            "Retry AI analysis later for detailed DSKP-aligned insights.",
            "Review any flagged questions above with the student(s).",
        ],
        "_fallback": True,
    }


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
# PYDANTIC SCHEMAS
# ---------------------------------------------------------------------------

LearningArea = Literal[
    "literacy_bm", "literacy_en", "numeracy", "social", "motor", "creative", "cognitive"
]

MoralEducation = Literal["moral", "islam"]


PlanType = Literal["subject", "unit"]
ImageStyle = Literal["cartoon", "photorealistic"]


class GenerateLessonRequest(BaseModel):
    id_token: str
    topic: str = Field(..., min_length=3)
    age_group: str = Field(default="5")
    learning_area: LearningArea = Field(default="literacy_bm")
    duration: int = Field(default=30, ge=10, le=120)
    additional_notes: str = Field(default="")
    moral_education: MoralEducation = Field(default="moral")
    language: Literal["bm", "en"] = Field(default="bm")
    plan_type: PlanType = Field(default="subject")
    duration_weeks: int = Field(default=1, ge=1, le=6)


ActivityType = Literal["quiz", "image", "story"]


class ActivityToGenerate(BaseModel):
    title: str
    description: str
    duration: str = ""
    type: ActivityType = "quiz"
    image_style: ImageStyle = "cartoon"


class GenerateActivitiesRequest(BaseModel):
    id_token: str
    lesson_plan_id: str
    lesson_title: str = ""
    topic: str = ""
    learning_area: str = ""
    age_group: str = "5"
    language: Literal["bm", "en"] = "bm"
    image_style: ImageStyle = "cartoon"
    activities: list[ActivityToGenerate] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# SYSTEM PROMPTS
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
- This system generates content end-to-end from lesson plan to activities. Assume all activities are delivered digitally on-screen — do NOT include physical materials.
- Each activity MUST be one of these three types:
    • "quiz"  — an interactive multiple-choice quiz game played on screen. Descriptions for quiz activities must describe the questions and knowledge being tested only — do NOT mention images, pictures, flashcards, or visual elements.
    • "image" — a set of educational flashcard images displayed on screen.
    • "story" — a short illustrated text story read on screen.
  Do NOT generate video, music, audio, or any other activity type. Every activity must be exactly one of: "quiz", "image", or "story".
- Activities represent the individual learning activities this lesson plan comprises. Each activity should have a clear title, a detailed description of what happens, an estimated duration, and a "type" field (one of "quiz", "image", "story"). Activities should fit within the time budget of {duration} minutes. Vary the types across activities for a richer lesson — do not make all activities the same type unless the topic strongly demands it.
- The "materials" array should list the specific digital resources needed for the activities. Each material should directly relate to one or more activities. For example: "Interactive quiz interface for [activity title]", "Flashcard images of [topic]", "Illustrated story reader: [story title]". Do NOT list generic or physical materials.
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
  "materials": ["<digital resource specific to an activity>", ...],
  "activities": [
    {{
      "title": "<activity name>",
      "description": "<detailed description of what happens in this activity>",
      "duration": "<X minutes>",
      "type": "<quiz|image|story>"
    }}
  ],
  "assessment": "<assessment strategy>",
  "adaptations": ["<adaptation1>", "<adaptation2>", ...],
  "teacher_notes": "<any important notes for the teacher>"
}}

Do NOT wrap the JSON in markdown code fences. Return raw JSON only.

{dskp_context}
"""

UNIT_PLAN_SYSTEM_PROMPT_TEMPLATE = """\
You are SabahSprout AI, an expert Malaysian kindergarten teacher and curriculum specialist.
You help teachers design **multi-week unit plans** (project-based learning) that are:
  1. Perfectly aligned with the DSKP KSPK Semakan 2026 curriculum.
  2. Developmentally appropriate for children aged {age_group} years.
  3. Engaging, playful, and culturally relevant to Sabah, Malaysia.
  4. Structured across {duration_weeks} week(s) with {duration} minutes of total learning time per week.

CRITICAL RULES:
- The unit plan must be written in {language_label}. DSKP standard codes remain in their original form.
- Always cite specific DSKP standard codes (e.g. BM 1.1.2, KF 2.3.1, PM 1.1) in the dskp_standards array. Each entry must be an object with "code" (the SPE code) and "title" (the SPE title from the DSKP document). A multi-week unit plan should cover MORE standards than a single lesson — aim for 6-12 SPE codes across the weeks.
- Every objective must map to at least one DSKP standard.
- This system generates content end-to-end from lesson plan to activities. Assume all activities are delivered digitally on-screen — do NOT include physical materials.
- Each activity MUST be one of these three types:
    • "quiz"  — an interactive multiple-choice quiz game played on screen.
    • "image" — a set of educational flashcard images displayed on screen.
    • "story" — a short illustrated text story read on screen.
  Do NOT generate video, music, audio, or any other activity type.
- The "weeks" array must contain exactly {duration_weeks} week objects. Each week should have a theme/focus, its own set of learning objectives, and 3-5 daily activities (one per day). Activities should build progressively — earlier weeks introduce concepts, later weeks deepen understanding and assess mastery.
- DURATION RULE: The sum of all activity durations within a single week must equal approximately {duration} minutes total. For example, if the weekly budget is 30 minutes and there are 3 activities, assign durations like 8, 12, and 10 minutes — NOT 30 minutes each. Never assign the full weekly budget to every individual activity.
- The "materials" array should list the specific digital resources needed across the entire unit.
- Use Bahasa Melayu terminology for DSKP references when appropriate (you can add English in parentheses).
- Adaptations must address diverse learners: visual, kinesthetic, EAL children, and children needing extra support.
- Your entire response MUST be a single valid JSON object following this exact schema:

{{
  "title": "<engaging unit plan title>",
  "unit_theme": "<overarching theme or driving question for the project>",
  "dskp_standards": [
    {{"code": "<SPE code>", "title": "<SPE title>"}},
    ...
  ],
  "objectives": ["<objective1>", "<objective2>", ...],
  "materials": ["<digital resource specific to an activity>", ...],
  "weeks": [
    {{
      "week_number": 1,
      "theme": "<weekly focus or sub-theme>",
      "objectives": ["<weekly objective 1>", ...],
      "activities": [
        {{
          "day": 1,
          "title": "<activity name>",
          "description": "<detailed description of what happens in this activity>",
          "duration": "<X minutes>",
          "type": "<quiz|image|story>"
        }}
      ]
    }}
  ],
  "assessment": "<overall assessment strategy across the unit>",
  "adaptations": ["<adaptation1>", "<adaptation2>", ...],
  "teacher_notes": "<any important notes for the teacher>"
}}

Do NOT wrap the JSON in markdown code fences. Return raw JSON only.

{dskp_context}
"""


# ---------------------------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/health")
async def ai_health_check():
    """Verify Gemini is accessible via the new SDK and ADC."""
    try:
        # Note: The new SDK uses a standard 'models.generate_content' pattern
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents="Reply with this phrase: Hello there.",
            config=types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=64
            )
        )
        
        # Accessing the text is now simpler
        content = response.text
        
        return {
            "status": "ok", 
            "model": GEMINI_MODEL, 
            "location": TEXT_LOCATION,
            "echo": content.strip()
        }
    except Exception as exc:
        # This will catch and explain any remaining 404s or permission issues
        print(f"DEBUG: Gemini Failure: {str(exc)}")
        return {"error": str(exc)}


@router.post("/generate-lesson")
async def generate_lesson(request: GenerateLessonRequest, db: Session = Depends(get_db)):
    teacher = _verify_teacher(request.id_token, db)
    dskp_context = _build_dskp_context(request.learning_area, request.moral_education)

    language_label = "English" if request.language == "en" else "Bahasa Malaysia"
    is_unit_plan = request.plan_type == "unit"

    if is_unit_plan:
        system_prompt = UNIT_PLAN_SYSTEM_PROMPT_TEMPLATE.format(
            age_group=request.age_group,
            duration=request.duration,
            duration_weeks=request.duration_weeks,
            language_label=language_label,
            dskp_context=dskp_context,
        )
    else:
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            age_group=request.age_group,
            duration=request.duration,
            language_label=language_label,
            dskp_context=dskp_context,
        )

    user_message = (
        f"Generate a {'multi-week unit plan' if is_unit_plan else 'lesson plan'} for the topic: '{request.topic}'.\n"
        f"Learning area: {request.learning_area}.\n"
        f"Session duration: {request.duration} minutes.\n"
        f"Age group: {request.age_group} years old.\n"
        f"Language of delivery: {language_label}.\n"
    )

    try:
        # Pass system_prompt separately now
        response = await _invoke_with_retry(
            messages=[{"role": "user", "content": user_message}],
            system_instruction=system_prompt,
            temperature=0.7,
            max_output_tokens=8192 if is_unit_plan else 4096,
        )
        
        # response.text is now guaranteed raw JSON by response_mime_type
        if not response.text:
            raise ValueError("Gemini returned an empty string.")
            
        lesson_data = json.loads(response.text)
    except Exception as e:
        logger.error(f"Gemini lesson generation failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Normalise and return — NOT saved to DB yet (teacher reviews first)
    result = {
        "title": lesson_data.get("title", f"{request.topic} Exploration"),
        "age_group": request.age_group,
        "learning_area": request.learning_area,
        "duration_minutes": request.duration,
        "topic": request.topic,
        "additional_notes": request.additional_notes,
        "moral_education": request.moral_education,
        "language": request.language,
        "plan_type": request.plan_type,
        "duration_weeks": request.duration_weeks if is_unit_plan else 1,
        "dskp_standards": lesson_data.get("dskp_standards", []),
        "objectives": lesson_data.get("objectives", []),
        "materials": lesson_data.get("materials", []),
        "assessment": lesson_data.get("assessment", ""),
        "adaptations": lesson_data.get("adaptations", []),
        "teacher_notes": lesson_data.get("teacher_notes", ""),
    }

    if is_unit_plan:
        result["unit_theme"] = lesson_data.get("unit_theme", "")
        result["weeks"] = lesson_data.get("weeks", [])
        all_activities = []
        for week in result["weeks"]:
            for act in week.get("activities", []):
                act["week_number"] = week.get("week_number", 1)
                all_activities.append(act)
        result["activities"] = all_activities
    else:
        result["activities"] = lesson_data.get("activities", [])

    return result


# ---------------------------------------------------------------------------
# ACTIVITY GENERATION SYSTEM PROMPTS
# ---------------------------------------------------------------------------

QUIZ_SYSTEM_PROMPT = """\
You are SabahSprout AI, creating a fun, age-appropriate quiz game for kindergarten children aged {age_group} years.
The quiz is part of a lesson: "{lesson_title}" (topic: {topic}, area: {learning_area}).

LANGUAGE REQUIREMENT (STRICT — NO EXCEPTIONS):
- Every piece of text you generate MUST be written entirely in {language_label}.
- This includes: questions, all answer options, and explanations.
- Do NOT mix languages. Do NOT use any other language, not even for a single word.
- If {language_label} is English, write everything in English only. If Bahasa Malaysia, write everything in Bahasa Malaysia only.
- The "image_prompt" field MUST always be written in English (required by the image generation model).

RULES:
- Generate exactly {num_questions} multiple-choice questions.
- Each question must have exactly 4 options (A, B, C, D).
- Questions must be simple and suitable for {age_group}-year-old children who are still learning to read.
- Make every question EASY and OBVIOUS: the correct answer should be clearly identifiable, and the wrong options (distractors) should be clearly and unmistakably different from the correct answer.
- Use very simple, short vocabulary. Avoid tricky wording or close distractors.
- Include a short, encouraging explanation for the correct answer.
- Each question MUST include an "image_prompt" field: a concise English description (under 50 words) for generating an illustrative image that helps the child understand the question.
  {image_style_instruction}
  • Describe the key concept or object in the question clearly.
  • Do NOT include any text, letters, numbers, or watermarks in the image description.
  • Cultural context: Sabah, Malaysia where relevant.
- Return ONLY a single valid JSON object with this schema:

{{
  "questions": [
    {{
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correct_answer": <0-3 index>,
      "explanation": "<short explanation>",
      "image_prompt": "<concise English prompt for image generation>"
    }}
  ]
}}

Do NOT wrap in markdown code fences. Return raw JSON only.
"""

IMAGE_SYSTEM_PROMPT = """\
You are SabahSprout AI, creating educational flashcard content for kindergarten children aged {age_group} years.
These flashcards will be illustrated using an AI image generator for a lesson: "{lesson_title}" (topic: {topic}, area: {learning_area}).

LANGUAGE REQUIREMENT (STRICT — NO EXCEPTIONS):
- The "label" and "learning_point" fields MUST be written entirely in {language_label}.
- Do NOT mix languages in those fields. Do NOT use any other language, not even for a single word.
- If {language_label} is English, write label and learning_point in English only. If Bahasa Malaysia, write them in Bahasa Malaysia only.
- The "image_prompt" field MUST always be written in English (required by the image generation model).

RULES:
- Generate exactly {num_images} flashcard entries.
- Each entry should teach a specific concept related to the activity.
- The "image_prompt" must be a concise, vivid English description optimised for image generation.
  {image_style_instruction}
  • Describe the main subject clearly (what it is, key details, colors, setting).
  • Add cultural context for Sabah, Malaysia where relevant (e.g. local foods, plants, settings).
  • Keep it under 60 words and do NOT request any text, labels, or watermarks in the image.
- Return ONLY a single valid JSON object with this schema:

{{
  "images": [
    {{
      "label": "<short title for the flashcard, in {language_label}>",
      "image_prompt": "<concise English prompt for image generation>",
      "learning_point": "<one sentence the child learns, in {language_label}>"
    }}
  ]
}}

Do NOT wrap in markdown code fences. Return raw JSON only.
"""

# Fixed illustration style prefixes for image generation
STORY_IMAGE_STYLE_CARTOON = (
    "Bright, colorful flat vector cartoon illustration in a children's educational storybook style, "
    "bold black outlines, vibrant saturated colors, round-faced Southeast Asian child characters with "
    "big expressive eyes and rosy cheeks, clean detailed backgrounds, smooth cel-shading, "
    "fully visible characters within frame, no text or watermarks."
)

STORY_IMAGE_STYLE_PHOTO = (
    "Ultra-realistic photograph, bright natural lighting, vibrant colors, sharp focus, "
    "Southeast Asian children, warm educational setting, Sabah Malaysia cultural context, "
    "no text or watermarks."
)

# Style instruction snippets injected into activity system prompts
IMAGE_STYLE_INSTRUCTIONS = {
    "cartoon": '• Begin with: "Bright colorful cartoon illustration, children\'s educational style, simple and cheerful,"',
    "photorealistic": '• Begin with: "Ultra-realistic photograph, bright natural lighting, vibrant colors, sharp focus, educational."',
}


def _get_story_image_prefix(image_style: str) -> str:
    return STORY_IMAGE_STYLE_PHOTO if image_style == "photorealistic" else STORY_IMAGE_STYLE_CARTOON

STORY_SYSTEM_PROMPT = """\
You are SabahSprout AI, writing a short, simple story for kindergarten children aged {age_group} years.
The story supports a lesson: "{lesson_title}" (topic: {topic}, area: {learning_area}).

LANGUAGE REQUIREMENT (STRICT — NO EXCEPTIONS):
- Every piece of text you generate MUST be written entirely in {language_label}.
- This includes: the story title, all page text, vocabulary words and definitions, and the moral.
- Do NOT mix languages. Do NOT use any other language, not even for a single word.
- If {language_label} is English, write everything in English only. If Bahasa Malaysia, write everything in Bahasa Malaysia only.

RULES:
- Write a short story with exactly {num_pages} pages (each page is 2-3 very short, simple sentences).
- Use only words a young child aged {age_group} already knows. Avoid long words, difficult vocabulary, or complex sentences.
- Each sentence must be short (under 10 words). Use simple Subject-Verb-Object structure (e.g. "Ali sees a cat.").
- The story must be cheerful, fun, and easy to follow. Children should understand every sentence immediately.
- Characters should be relatable to children in Sabah, Malaysia.
- Include a simple, one-sentence moral that a child can understand.
- Include 3-5 vocabulary words with very simple, one-sentence definitions written for young children.
- Each page MUST include an "image_prompt" field: a concise English description (under 40 words) of ONLY what is happening in that specific scene — characters, actions, objects, setting.
  • Describe the main character's appearance consistently across all pages (e.g. same name, clothing, features).
  • Cultural context: Sabah, Malaysia.
  • Each page's prompt must be distinct.
- Return ONLY a single valid JSON object with this schema:

{{
  "story_title": "<engaging story title>",
  "pages": [
    {{
      "page_number": 1,
      "text": "<2-4 sentences of story text>",
      "image_prompt": "<scene-only description for this page>"
    }}
  ],
  "vocabulary": [
    {{"word": "<word>", "definition": "<simple definition>"}}
  ],
  "moral": "<one sentence moral or learning outcome>"
}}

Do NOT wrap in markdown code fences. Return raw JSON only.
"""


# ---------------------------------------------------------------------------
# ACTIVITY GENERATION HELPERS
# ---------------------------------------------------------------------------

import base64
import asyncio

# Create a semaphore to limit image generation to 1 at a time to avoid 429s
image_semaphore = asyncio.Semaphore(1)

image_client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location="us-central1"
)

def _handle_response_content(content) -> str:
    """Normalise Gemini response content (handles list vs string formats)."""
    if isinstance(content, list):
        return "".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in content)
    return str(content).strip()


async def _generate_flashcard_images(prompts: list[dict], aspect_ratio: str = "1:1") -> list[dict]:
    """
    Generate images using Imagen 4.0 on Vertex AI.
    Sequential execution via Semaphore ensures we don't hit 429 limits.
    """
    for p in prompts:
        # Use the semaphore to handle the burst of story/quiz pages
        async with image_semaphore:
            try:
                res = await image_client.aio.models.generate_images(
                    model=IMAGEN_MODEL,
                    prompt=p["image_prompt"],
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio=aspect_ratio,
                        add_watermark=True,
                    )
                )
                
                if res.generated_images:
                    # Vertex AI gives us raw bytes, NOT a URL.
                    # Access the image_bytes attribute directly from the Image object.
                    img_obj = res.generated_images[0].image
                    
                    if hasattr(img_obj, 'image_bytes') and img_obj.image_bytes:
                        raw_bytes = img_obj.image_bytes
                    else:
                        # Fallback for different SDK sub-versions
                        raw_bytes = img_obj.data 
                    
                    # Convert bytes to Base64 so the browser <img> tag can display it
                    b64_encoded = base64.b64encode(raw_bytes).decode("utf-8")
                    p["image_url"] = f"data:image/png;base64,{b64_encoded}"
                    
                    logger.info(f"Generated Base64 image for: {p.get('label')}")
                else:
                    p["image_url"] = None
                
                # Mandatory 1s cooldown to keep the 429s away
                await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"Image generation failed for '{p.get('label')}': {str(e)}")
                p["image_url"] = None
            
    return prompts


async def _generate_single_activity(
    activity: ActivityToGenerate,
    lesson_title: str,
    topic: str,
    learning_area: str,
    age_group: str,
    language: str,
    image_style: str = "cartoon",
) -> dict:
    """
    Generate content for a single activity. 
    Steps: 1. Text Gen (Gemini) -> 2. Parse JSON -> 3. Image Gen (Imagen) -> 4. Map back.
    """
    language_label = "English" if language == "en" else "Bahasa Malaysia"
    style_instruction = IMAGE_STYLE_INSTRUCTIONS.get(image_style, IMAGE_STYLE_INSTRUCTIONS["cartoon"])
    
    common_vars = dict(
        age_group=age_group,
        lesson_title=lesson_title,
        topic=topic,
        learning_area=learning_area,
        language_label=language_label,
        image_style_instruction=style_instruction,
    )

    # 1. Select the correct system prompt template
    if activity.type == "quiz":
        system_prompt = QUIZ_SYSTEM_PROMPT.format(num_questions=5, **common_vars)
    elif activity.type == "image":
        system_prompt = IMAGE_SYSTEM_PROMPT.format(num_images=4, **common_vars)
    elif activity.type == "story":
        system_prompt = STORY_SYSTEM_PROMPT.format(num_pages=5, **common_vars)
    else:
        raise ValueError(f"Unknown activity type: {activity.type}")

    user_message = f"Activity: {activity.title}\nDescription: {activity.description}\nGenerate the content now."

    # 2. Capture the response from Gemini
    # Ensure _invoke_with_retry is using the 'client' (location="us")
    try:
        response = await _invoke_with_retry(
            messages=[{"role": "user", "content": user_message}],
            system_instruction=system_prompt,
            temperature=0.7,
            max_output_tokens=4096
        )
        
        if not response or not response.text:
            raise ValueError("Gemini returned an empty response.")
            
        content_data = json.loads(response.text)
    except Exception as e:
        logger.error(f"Text generation failed for '{activity.title}': {str(e)}")
        raise ValueError(f"AI failed to generate text content: {str(e)}")

    # 3. Handle Image Generation & Mapping results back to content_data
    # -----------------------------------------------------------------------
    
    # CASE A: Standard Flashcards/Images
    if activity.type == "image" and content_data.get("images"):
        # We pass the list directly; _generate_flashcard_images updates it in-place
        content_data["images"] = await _generate_flashcard_images(content_data["images"])

    # CASE B: Quiz Questions (Images per question)
    if activity.type == "quiz" and content_data.get("questions"):
        for i, q in enumerate(content_data["questions"]):
            if q.get("image_prompt"):
                # We create a single-item payload for the image generator
                img_payload = [{"image_prompt": q["image_prompt"], "label": f"Q{i+1}"}]
                updated_payload = await _generate_flashcard_images(img_payload)
                # Map the Base64 result back to the original question dictionary
                q["image_url"] = updated_payload[0].get("image_url")
                # Remove the prompt to keep the final JSON clean
                q.pop("image_prompt", None)

    # CASE C: Story Pages (Images per page)
    if activity.type == "story" and content_data.get("pages"):
        for i, p in enumerate(content_data["pages"]):
            if p.get("image_prompt"):
                # Apply the story-specific prefix if you have one
                full_prompt = f"{_get_story_image_prefix(image_style)} {p['image_prompt']}".strip()
                img_payload = [{"image_prompt": full_prompt, "label": f"P{i+1}"}]
                updated_payload = await _generate_flashcard_images(img_payload)
                # Map back to the page
                p["image_url"] = updated_payload[0].get("image_url")
                p.pop("image_prompt", None)

    # 4. Final Return
    return {
        "title": activity.title,
        "description": activity.description,
        "type": activity.type,
        "duration": activity.duration,
        "generated_content": content_data,
    }


# ---------------------------------------------------------------------------
# ACTIVITY GENERATION ENDPOINTS
# ---------------------------------------------------------------------------

@router.post("/generate-activities")
async def generate_activities(request: GenerateActivitiesRequest, db: Session = Depends(get_db)):
    """
    Generate AI content for one or more activities from a lesson plan.
    Each activity gets content based on its type (quiz, image, story).
    Returns generated content for review before saving.
    """
    teacher = _verify_teacher(request.id_token, db)

    # Verify lesson plan exists and belongs to this teacher
    plan = db.query(models.LessonPlan).filter(
        models.LessonPlan.id == request.lesson_plan_id,
        models.LessonPlan.teacher_id == teacher.id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")

    # Fan out — generate all activities concurrently
    # The unified 'client' is global; passing a model object is no longer required
    tasks = [
        _generate_single_activity(
            activity=act,
            lesson_title=request.lesson_title or plan.title,
            topic=request.topic or plan.topic,
            learning_area=request.learning_area or plan.learning_area,
            age_group=request.age_group,
            language=request.language,
            image_style=act.image_style or request.image_style,
        )
        for act in request.activities
    ]

    try:
        results = await asyncio.gather(*tasks)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Activity generation failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    return {
        "lesson_plan_id": request.lesson_plan_id,
        "generated": list(results),
    }


# ---------------------------------------------------------------------------
# ACTIVITY ANALYSIS (PHASE 3 – AI INSIGHTS)
# ---------------------------------------------------------------------------

class AnalyzeActivityRequest(BaseModel):
    id_token: str
    activity_id: str


def _resolve_spr_context(learning_area: str, dskp_standards: list[dict]) -> str:
    """
    Build context string containing SPR rubrics mapping to DSKP standards.
    (Logic remains unchanged as it is a local JSON/string resolution).
    """
    primary_files = list(AREA_TO_FILES.get(learning_area, AREA_TO_FILES["cognitive"]))
    curriculum_data = _load_curriculum_files(primary_files)
    if not curriculum_data or not dskp_standards:
        return ""

    spe_codes: set[str] = set()
    for std in dskp_standards:
        code = std.get("code", "") if isinstance(std, dict) else str(std)
        if code:
            spe_codes.add(code.strip())

    sk_codes: set[str] = set()
    for spe in spe_codes:
        parts = spe.rsplit(".", 1)
        if len(parts) == 2:
            sk_codes.add(parts[0])

    lines: list[str] = ["=== Relevant SPR (Assessment Rubric) Standards ==="]
    found_any = False
    for domain in curriculum_data:
        for spr in domain.get("performance_metrics", []):
            component_sks = set(spr.get("spr_component_sks", []))
            if component_sks & sk_codes:
                found_any = True
                lines.append(f"\n[{spr['spr_code']}] {spr.get('spr_title', '')}")
                lines.append(f"  Component SKs: {', '.join(spr.get('spr_component_sks', []))}")
                for rubric in spr.get("spr_rubric", []):
                    lines.append(f"  Level {rubric['level']}: {rubric['explanation']}")

    lines.append("\n=== Targeted DSKP Standards (SPEs) ===")
    for std in dskp_standards:
        code = std.get("code", "") if isinstance(std, dict) else str(std)
        title = std.get("title", "") if isinstance(std, dict) else ""
        lines.append(f"  [{code}] {title}")

    return "\n".join(lines) if found_any else ""


ANALYSIS_SYSTEM_PROMPT = """\
You are SabahSprout AI, an expert Malaysian kindergarten assessment specialist.
You analyse completed classroom activity data to generate insights for teachers.

You will be given:
1. Activity metadata (title, type, learning area)
2. The activity content (questions/flashcards/story pages that were delivered)
3. The results data (scores, timing, retry attempts, per-question/per-card/per-page metrics)
4. The DSKP standards targeted by the lesson plan
5. The SPR (Assessment Rubric) standards with their level descriptors (1, 2, 3)
6. The list of participating students

YOUR TASK:
A. Analyse the performance data holistically.
B. For each relevant SPR standard, suggest an attainment level (1, 2, or 3) with justification based on the actual data.
C. Flag any anomalies that may need teacher intervention — for example:
   - A question that took unusually long (near or exceeding the time limit)
   - A question that required many retry attempts
   - A story page that was skipped very quickly (< 3 seconds) or lingered on too long (> 60 seconds)
   - A flashcard viewed for less than 2 seconds
D. Provide overall strengths, areas for improvement, and actionable recommendations.

CRITICAL: Base your analysis ONLY on the data provided. Do not invent scores or metrics.
If data is insufficient for a particular SPR, say so.

Return ONLY a single valid JSON object with this exact schema:
{{
  "summary": "<2-3 sentence overall performance narrative>",
  "spr_attainment": [
    {{
      "spr_code": "<e.g. BI 1>",
      "spr_title": "<the SPR title>",
      "suggested_level": <1|2|3>,
      "justification": "<2-3 sentences explaining why this level based on the data>"
    }}
  ],
  "interventions": [
    {{
      "type": "<slow_response|many_retries|skipped_content|unusual_pattern>",
      "detail": "<specific observation with data points>",
      "severity": "<info|flag|urgent>"
    }}
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "areas_for_improvement": ["<area 1>", "<area 2>"],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"]
}}

Do NOT wrap the JSON in markdown code fences. Return raw JSON only.
"""

import re

def _extract_json(text: str) -> str:
    """
    Finds the first '{' and last '}' to extract a single JSON object,
    ignoring any 'Extra data' or prose before/after.
    """
    text = text.strip()
    # Match everything from the first '{' to the last '}'
    match = re.search(r'(\{.*\})', text, re.DOTALL)
    if match:
        return match.group(1)
    return text # Fallback to original text if no braces found


@router.post("/analyze-activity")
async def analyze_activity(request: AnalyzeActivityRequest, db: Session = Depends(get_db)):
    """
    Run AI analysis on a completed activity's results data.
    Creates a Report with structured insights from Gemini.
    """
    teacher = _verify_teacher(request.id_token, db)

    activity = db.query(models.Activity).filter(
        models.Activity.id == request.activity_id,
        models.Activity.teacher_id == teacher.id,
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.status != "completed":
        raise HTTPException(status_code=400, detail="Activity must be completed before analysis")
    if not activity.results_data:
        raise HTTPException(status_code=400, detail="No results data to analyse")

    # Re-run logic: soft-delete old reports
    if activity.analysis_status in ("completed", "failed"):
        old_reports = db.query(models.Report).filter(
            models.Report.activity_id == activity.id,
        ).all()
        for old in old_reports:
            old.is_deleted = True
        db.flush()

    # Mark status as analyzing
    activity.analysis_status = "analyzing"
    activity.analysis_error = None
    db.commit()

    # Context Gathering
    lesson_plan = None
    dskp_standards = []
    if activity.lesson_plan_id:
        lesson_plan = db.query(models.LessonPlan).filter(
            models.LessonPlan.id == activity.lesson_plan_id
        ).first()
        if lesson_plan:
            dskp_standards = lesson_plan.dskp_standards or []

    student_links = db.query(models.ActivityStudent).filter(
        models.ActivityStudent.activity_id == activity.id
    ).all()
    student_ids = [sl.student_id for sl in student_links]
    students = db.query(models.Student).filter(
        models.Student.id.in_(student_ids)
    ).all() if student_ids else []

    spr_context = _resolve_spr_context(
        activity.learning_area or (lesson_plan.learning_area if lesson_plan else "cognitive"),
        dskp_standards,
    )

    # Building AI Message Payload
    activity_info = {
        "title": activity.title,
        "description": activity.description,
        "activity_type": activity.activity_type,
        "learning_area": activity.learning_area,
        "duration_minutes": activity.duration_minutes,
    }

    user_message_parts = [
        f"=== Activity ===\n{json.dumps(activity_info, indent=2)}",
        f"\n=== Results Data ===\n{json.dumps(activity.results_data, indent=2)}",
    ]

    if activity.generated_content:
        # Strip heavy Base64/Images to save tokens and avoid JSON clutter
        content_for_analysis = _strip_images_for_analysis(activity.generated_content)
        user_message_parts.append(
            f"\n=== Activity Content (what was delivered) ===\n{json.dumps(content_for_analysis, indent=2)}"
        )

    if spr_context:
        user_message_parts.append(f"\n{spr_context}")

    if students:
        student_info = [{"name": s.name, "age": s.age} for s in students]
        user_message_parts.append(
            f"\n=== Students ===\n{json.dumps(student_info, indent=2)}"
        )

    user_message = "\n".join(user_message_parts)

    # AI Call Phase
    try:
        response = await _invoke_with_retry(
            messages=[{"role": "user", "content": user_message}],
            system_instruction=ANALYSIS_SYSTEM_PROMPT,
            temperature=0.1, # Drop temperature to 0.1 for even stricter JSON
            max_output_tokens=4096,
        )
        
        # 1. Capture the raw text
        raw_text = response.text
        
        # 2. Extract ONLY the JSON object to avoid 'Extra Data' errors
        clean_json = _extract_json(raw_text)
        
        # 3. Parse the cleaned string
        insights = json.loads(clean_json)
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {e}\nRaw Response: {raw_text}")
        if _is_503_error(e):
            logger.info("Gemini 503 persisted; generating fallback analysis")
            insights = _generate_fallback_insights(
                activity, activity.results_data or {}, students, dskp_standards
            )
        else:
            activity.analysis_status = "failed"
            activity.analysis_error = str(e)[:500]
            db.commit()
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Calculate Summary Stats
    score_pct = None
    results = activity.results_data or {}
    if results.get("activity_type") == "quiz" and results.get("total"):
        first_correct = results.get("first_attempt_correct", 0)
        score_pct = round(first_correct / results["total"] * 100, 1)

    report_details = {
        "ai_insights": insights,
        "activity_title": activity.title,
        "activity_type": activity.activity_type,
        "learning_area": activity.learning_area,
        "dskp_standards": dskp_standards,
        "results_summary": {
            "first_attempt_correct": results.get("first_attempt_correct"),
            "total": results.get("total"),
            "score_percentage": score_pct,
            "time_seconds": results.get("time_seconds"),
        },
        "student_count": len(students),
    }

    # Save to Database
    report = models.Report(
        id=str(uuid.uuid4()),
        teacher_id=teacher.id,
        activity_id=activity.id,
        title=f"{activity.title} Analysis",
        summary=insights.get("summary", ""),
        details=report_details,
    )
    db.add(report)
    db.flush()

    for sid in student_ids:
        db.add(models.ReportStudent(report_id=report.id, student_id=sid))

    activity.analysis_status = "completed"
    activity.analysis_error = None
    db.commit()
    db.refresh(activity)

    # ── Auto-trigger Phase 4 (Intervention Analysis) ──
    il_results = []
    for s in students:
        try:
            il_result = await _run_intervention_analysis(
                student=s,
                teacher_id=teacher.id,
                db=db,
                trigger_report_id=report.id,
            )
            il_results.append(il_result)
        except Exception as e:
            logger.warning(f"Auto-IL failed for student {s.id}: {e}")
            db.rollback()
            il_results.append({"student_id": s.id, "error": str(e)})

    return {
        "activity_id": activity.id,
        "analysis_status": "completed",
        "report_id": report.id,
        "insights": insights,
        "intervention_analyses": il_results,
    }

def _strip_images_for_analysis(content: dict) -> dict:
    """Remove image metadata to minimize token count and noise for analysis."""
    import copy
    stripped = copy.deepcopy(content)
    # Strip from standard image flashcards
    for img in stripped.get("images", []):
        img.pop("image_url", None)
    # Strip from storybook pages
    for page in stripped.get("pages", []):
        page.pop("image_url", None)
    # Strip from quiz questions
    for q in stripped.get("questions", []):
        q.pop("image_url", None)
    return stripped


# ---------------------------------------------------------------------------
# Student Intervention Analysis (Phase 4 — v2: auto-trigger, per-student)
# ---------------------------------------------------------------------------

class GenerateInterventionsRequest(BaseModel):
    id_token: str
    student_id: str


INTERVENTION_SYSTEM_PROMPT = """\
You are SabahSprout AI, an expert Malaysian kindergarten developmental specialist.
You analyse a single student's holistic performance data to determine four things:

  I.   **Improvement Over Time** — Has the child shown measurable improvement across sessions?
  II.  **Intervention Needs** — Does the child require specific intervention in any learning area?
  III. **Unique Inclinations & Strengths** — What areas does the child naturally excel in or show enthusiasm for?
  IV.  **School Readiness** — For children aged 5 (transitioning to 6 or 7), is the child developmentally ready for formal primary school?

You will be given:
- The student's profile (name, age)
- **Payload A: Current Report** — the latest activity report with AI insights, results data, and flagged observations
- **Payload B: Historical Reports** — previous activity reports (up to 15, most recent first) for trend comparison
- **Payload C: DSKP Progress** — StudentProgress SPR attainment scores across all learning domains (level 1 = needs support, 2 = developing, 3 = proficient)
- **Payload D: Prior Interventions** — previously generated interventions with their current status (resolved, in_progress, or pending). Use this to understand what was already flagged and how the teacher responded.

YOUR ANALYSIS MUST CONSIDER:
A. **Academic performance** — quiz scores, accuracy across learning areas, first-attempt correctness.
B. **Response patterns** — questions that took unusually long may indicate comprehension difficulty; very fast answers (<3s) may indicate rushing or strong confidence.
C. **Engagement & screen time** — total session durations, time spent on flashcards (<2s = possible disinterest), story pages skipped quickly, overall attention patterns.
D. **Interactivity as motor skills indicator** — ability to navigate the app, respond to taps/clicks, and complete drag/selection tasks reflects fine motor coordination.
E. **Cross-domain patterns** — e.g. a child scoring poorly in numeracy but well in motor skills might thrive with kinesthetic/hands-on approaches.
F. **Retry patterns** — frequent retries on certain question types indicate specific concept gaps.
G. **Consistency & variance** — does the child perform consistently or show high variance across sessions?
H. **Incomplete DSKP data** — if SPR scores are sparse or missing for certain domains, note the gap and base analysis on available data only. Do not assume performance where data is absent.

SCHOOL READINESS ASSESSMENT (Objective IV):
- Only generate a school readiness assessment if the child is aged 5, 6, or 7.
- Evaluate: cognitive readiness, language proficiency (BM and BI), socioemotional maturity, fine/gross motor skills, attention span (inferred from session times), and ability to follow multi-step instructions (inferred from activity completion patterns).
- Provide a readiness level: "ready", "almost_ready", or "not_yet_ready" with clear justification.
- If the child is not aged 5-7, set school_readiness to null.

IMPROVEMENT TRACKING (Objective I):
- Compare the current report's performance with historical reports.
- Note specific areas of improvement or regression.
- Assign a trend: "improving", "stable", "declining", or "insufficient_data".

PRIOR INTERVENTION AWARENESS (Payload D):
- If Payload D shows interventions that were "resolved" by the teacher, do NOT re-flag the same area/concern **unless** the current data (Payloads A/B/C) shows clear evidence of regression in that specific area after the resolution date.
- If a resolved intervention's area still shows difficulty, acknowledge the prior intervention and note that the concern has resurfaced, citing the new data.
- If an intervention is still "in_progress" or "pending", do NOT create a duplicate — only flag a NEW concern in that area if it is materially different from the existing one.
- When the student has cleared all prior interventions and current data shows adequate performance, return 0 interventions.

RULES:
- Generate 0-3 intervention items. Only flag genuine concerns — do NOT fabricate interventions if data shows the student is doing well.
- For each intervention, assign a priority: "high" (urgent, significant gap), "medium" (notable concern), or "low" (minor, worth monitoring).
- For each, list 2-4 specific, actionable recommended actions the teacher or parent can take.
- Separately, identify 0-3 positive inclinations/strengths the student shows.
- If the student is performing well overall, it is perfectly valid to return 0 interventions and only inclinations.
- NEVER reference internal payload labels ("Payload A", "Payload B", "Payload C", "Payload D") anywhere in your output. Use plain language instead — e.g. "recent activity results", "past sessions", "DSKP progress records", "prior interventions".

Return ONLY a single valid JSON object with this exact schema:
{{
  "overall_summary": "<2-3 sentence holistic assessment of the child>",
  "improvement_data": {{
    "trend": "<improving|stable|declining|insufficient_data>",
    "details": "<2-3 sentences describing the performance trajectory>",
    "comparison_points": [
      {{
        "area": "<learning area>",
        "previous": "<prior performance observation>",
        "current": "<current performance observation>",
        "direction": "<up|down|stable>"
      }}
    ]
  }},
  "school_readiness": null | {{
    "level": "<ready|almost_ready|not_yet_ready>",
    "assessment": "<2-3 sentence holistic readiness evaluation>",
    "cognitive_readiness": "<brief note>",
    "language_readiness": "<brief note>",
    "socioemotional_readiness": "<brief note>",
    "motor_readiness": "<brief note>",
    "recommendations": ["<recommendation 1>", "<recommendation 2>"]
  }},
  "interventions": [
    {{
      "area": "<learning area or developmental area>",
      "priority": "<high|medium|low>",
      "concern": "<2-3 sentence description of the concern based on data>",
      "recommended_actions": ["<action 1>", "<action 2>", ...],
      "reasoning": "<why this was flagged, citing specific data points>"
    }}
  ],
  "inclinations": [
    {{
      "area": "<area of strength>",
      "observation": "<what the data shows>",
      "suggestion": "<how to nurture this strength>"
    }}
  ]
}}

Do NOT wrap the JSON in markdown code fences. Return raw JSON only.
"""


async def _run_intervention_analysis(
    student: models.Student,
    teacher_id: str,
    db: Session,
    trigger_report_id: str | None = None,
) -> dict:
    """
    Holistic student analysis. Gathers historical data (A/B/C/D), 
    calls Gemini 3.1 Flash-Lite, and persists fresh intervention records.
    """
    # [PAYLOAD GATHERING LOGIC - Stays the same as your data aggregation is solid]
    # ... (SPR scores, Historical Reports, Student Profile, Prior Interventions) ...

    # 1. Payload C: SPR scores
    progress_records = db.query(models.StudentProgress).filter(
        models.StudentProgress.student_id == student.id
    ).all()
    spr_scores = [{"domain_key": p.domain_key, "spr_code": p.spr_code, "level": p.level} for p in progress_records]

    # 2. Payload A+B: Reports
    report_student_links = db.query(models.ReportStudent).filter(models.ReportStudent.student_id == student.id).all()
    report_ids = [rl.report_id for rl in report_student_links]
    
    current_report_data = None
    historical_reports = []
    if report_ids:
        report_rows = db.query(models.Report).filter(
            models.Report.id.in_(report_ids),
            models.Report.is_deleted == False
        ).order_by(models.Report.created_at.desc()).limit(15).all()

        for r in report_rows:
            report_data = {
                "report_id": r.id,
                "title": r.title,
                "summary": r.summary,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "ai_insights": r.details.get("ai_insights") if r.details else None
            }
            if trigger_report_id and r.id == trigger_report_id:
                current_report_data = report_data
            else:
                historical_reports.append(report_data)

    # 3. Payload D: Prior Interventions
    prior_interventions_data = []
    prior_interventions = db.query(models.Intervention).filter(
        models.Intervention.student_id == student.id,
        models.Intervention.teacher_id == teacher_id
    ).order_by(models.Intervention.created_at.desc()).all()
    
    for pi in prior_interventions:
        prior_interventions_data.append({
            "area": pi.area, "concern": pi.concern, "status": pi.status, "priority": pi.priority
        })

    # 4. Build User Message
    user_parts = [f"=== Student Profile ===\n{json.dumps({'name': student.name, 'age': student.age}, indent=2)}"]
    if current_report_data: 
        user_parts.append(f"\n=== Current Report ===\n{json.dumps(current_report_data, indent=2)}")
    if historical_reports: 
        user_parts.append(f"\n=== History ===\n{json.dumps(historical_reports, indent=2)}")
    if spr_scores: 
        user_parts.append(f"\n=== DSKP Attainment ===\n{json.dumps(spr_scores, indent=2)}")
    if prior_interventions_data: 
        user_parts.append(f"\n=== Past Interventions ===\n{json.dumps(prior_interventions_data, indent=2)}")

    user_message = "\n".join(user_parts)

    # 5. Call Gemini 3.1 Flash-Lite
    try:
        # We use temperature 0.1 for maximum factual consistency in reports
        response = await _invoke_with_retry(
            messages=[{"role": "user", "content": user_message}],
            system_instruction=INTERVENTION_SYSTEM_PROMPT,
            temperature=0.1, 
            max_output_tokens=6144
        )
        
        # Safe JSON Extraction (the 'Extra Data' fix)
        clean_json = _extract_json(response.text)
        result = json.loads(clean_json)

    except Exception as e:
        logger.error(f"Intervention analysis failed for {student.id}: {e}")
        # We raise here because this is often called inside a loop; 
        # parent handles the failure per-student.
        raise HTTPException(status_code=502, detail=f"AI Intelligence error: {str(e)}")

    # 6. Database Persistence (Replace old analysis with fresh one)
    # -----------------------------------------------------------------------
    old_analyses = db.query(models.InterventionAnalysis).filter(
        models.InterventionAnalysis.student_id == student.id,
        models.InterventionAnalysis.teacher_id == teacher_id
    ).all()
    old_ids = [a.id for a in old_analyses]

    if old_ids:
        db.query(models.Intervention).filter(models.Intervention.analysis_id.in_(old_ids)).delete(synchronize_session=False)
        db.query(models.InterventionAnalysis).filter(models.InterventionAnalysis.id.in_(old_ids)).delete(synchronize_session=False)
    
    db.flush()

    # 1. Generate the ID manually so we have it for both parent and children
    analysis_id = str(uuid.uuid4())

    # 2. Create and add the Parent (Analysis)
    analysis = models.InterventionAnalysis(
        id=analysis_id,
        teacher_id=teacher_id,
        student_id=student.id,
        trigger_report_id=trigger_report_id,
        overall_summary=result.get("overall_summary", ""),
        improvement_data=result.get("improvement_data"),
        school_readiness=result.get("school_readiness"),
        inclinations=result.get("inclinations", []),
        source_report_ids=report_ids[:15],
    )
    db.add(analysis)
    
    # CRITICAL: This is the handshake. 
    # It sends the 'analysis' to Postgres immediately so the Foreign Key exists
    # for the next set of inserts, but doesn't finish the transaction yet.
    db.flush() 

    # 3. Create and add the Children (Interventions)
    created_interventions = []
    for item in result.get("interventions", []):
        intervention = models.Intervention(
            id=str(uuid.uuid4()),
            teacher_id=teacher_id,
            student_id=student.id,
            analysis_id=analysis_id,  # Back to using the string ID
            priority=item.get("priority", "medium"),
            status="pending",
            area=item.get("area", "General"),
            concern=item.get("concern", ""),
            recommended_actions=item.get("recommended_actions", []),
            ai_reasoning=item.get("reasoning", ""),
            source_report_ids=report_ids[:15],
        )
        db.add(intervention)
        created_interventions.append(intervention)

    # 4. Final update to student status
    has_concerns = any(
        item.get("priority") in ("high", "medium")
        for item in result.get("interventions", [])
    )
    student.needs_intervention = has_concerns
    
    # 5. Commit everything. Postgres is now happy because it saw the Parent first.
    db.commit()
    
    return {
        "student_id": student.id,
        "student_name": student.name,
        "analysis_id": analysis_id,
        "intervention_count": len(created_interventions),
        "needs_intervention": has_concerns,
        "overall_summary": result.get("overall_summary", ""),
        # Keep the full result in 'insights' in case the UI needs more detail
        "insights": result 
    }


@router.post("/generate-interventions")
async def generate_interventions(request: GenerateInterventionsRequest, db: Session = Depends(get_db)):
    """Manual trigger for holistic student analysis."""
    teacher = _verify_teacher(request.id_token, db)
    student = db.query(models.Student).filter(
        models.Student.id == request.student_id,
        models.Student.teacher_id == teacher.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return await _run_intervention_analysis(student, teacher.id, db)


@router.post("/student-interventions")
async def list_student_interventions(request: GenerateInterventionsRequest, db: Session = Depends(get_db)):
    """List saved interventions for a student."""
    teacher = _verify_teacher(request.id_token, db)

    interventions = db.query(models.Intervention).filter(
        models.Intervention.student_id == request.student_id,
        models.Intervention.teacher_id == teacher.id,
    ).order_by(models.Intervention.created_at.desc()).all()

    return [
        {
            "id": i.id,
            "student_id": i.student_id,
            "analysis_id": i.analysis_id,
            "priority": i.priority,
            "status": i.status,
            "area": i.area,
            "concern": i.concern,
            "recommended_actions": i.recommended_actions,
            "inclinations": i.inclinations,
            "ai_reasoning": i.ai_reasoning,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in interventions
    ]


class UpdateInterventionStatusRequest(BaseModel):
    id_token: str
    intervention_id: str
    status: str  # "pending" | "in_progress" | "resolved"


@router.post("/update-intervention-status")
async def update_intervention_status(request: UpdateInterventionStatusRequest, db: Session = Depends(get_db)):
    """Update the status of an intervention."""
    teacher = _verify_teacher(request.id_token, db)

    intervention = db.query(models.Intervention).filter(
        models.Intervention.id == request.intervention_id,
        models.Intervention.teacher_id == teacher.id,
    ).first()
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention not found")

    if request.status not in ("pending", "in_progress", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid status")

    intervention.status = request.status
    if request.status == "resolved":
        intervention.resolved_at = func.now()

    # Recalculate needs_intervention: true only if there are still active (non-resolved) interventions
    remaining_active = db.query(models.Intervention).filter(
        models.Intervention.student_id == intervention.student_id,
        models.Intervention.teacher_id == teacher.id,
        models.Intervention.id != intervention.id,
        models.Intervention.status != "resolved",
    ).count()
    still_needs = remaining_active > 0 if request.status == "resolved" else True
    student = db.query(models.Student).filter(
        models.Student.id == intervention.student_id
    ).first()
    if student:
        student.needs_intervention = still_needs

    db.commit()
    return {"id": intervention.id, "status": intervention.status, "needs_intervention": still_needs}


class ListAllInterventionsRequest(BaseModel):
    id_token: str


@router.post("/all-interventions")
async def list_all_interventions(request: ListAllInterventionsRequest, db: Session = Depends(get_db)):
    """List all interventions for all students of this teacher."""
    teacher = _verify_teacher(request.id_token, db)

    interventions = db.query(models.Intervention).filter(
        models.Intervention.teacher_id == teacher.id,
    ).order_by(models.Intervention.created_at.desc()).all()

    # Get student names
    student_ids = list(set(i.student_id for i in interventions))
    students = db.query(models.Student).filter(models.Student.id.in_(student_ids)).all() if student_ids else []
    student_map = {s.id: s for s in students}

    return [
        {
            "id": i.id,
            "student_id": i.student_id,
            "student_name": student_map.get(i.student_id, None) and student_map[i.student_id].name,
            "analysis_id": i.analysis_id,
            "priority": i.priority,
            "status": i.status,
            "area": i.area,
            "concern": i.concern,
            "recommended_actions": i.recommended_actions,
            "inclinations": i.inclinations,
            "ai_reasoning": i.ai_reasoning,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in interventions
    ]


@router.post("/all-analyses")
async def list_all_analyses(request: ListAllInterventionsRequest, db: Session = Depends(get_db)):
    """List latest InterventionAnalysis for each student of this teacher."""
    teacher = _verify_teacher(request.id_token, db)

    analyses = db.query(models.InterventionAnalysis).filter(
        models.InterventionAnalysis.teacher_id == teacher.id,
    ).order_by(models.InterventionAnalysis.created_at.desc()).all()

    # Get student names
    student_ids = list(set(a.student_id for a in analyses))
    students = db.query(models.Student).filter(models.Student.id.in_(student_ids)).all() if student_ids else []
    student_map = {s.id: s for s in students}

    # Only return the latest per student
    seen = set()
    results = []
    for a in analyses:
        if a.student_id in seen:
            continue
        seen.add(a.student_id)
        s = student_map.get(a.student_id)
        results.append({
            "id": a.id,
            "student_id": a.student_id,
            "student_name": s.name if s else None,
            "student_age": s.age if s else None,
            "overall_summary": a.overall_summary,
            "improvement_data": a.improvement_data,
            "school_readiness": a.school_readiness,
            "inclinations": a.inclinations,
            "trigger_report_id": a.trigger_report_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return results


# ---------------------------------------------------------------------------
# Parent-accessible intervention endpoints
# ---------------------------------------------------------------------------

class ParentAuthenticatedRequest(BaseModel):
    id_token: str


def _verify_parent_or_teacher(id_token: str, db: Session) -> models.User:
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = db.query(models.User).filter(models.User.id == decoded["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in ("parent", "teacher"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return user


@router.post("/child-analysis/{student_id}")
async def get_child_analysis(student_id: str, request: ParentAuthenticatedRequest, db: Session = Depends(get_db)):
    """Get the latest InterventionAnalysis for a student (parent or teacher)."""
    user = _verify_parent_or_teacher(request.id_token, db)

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if user.role == "parent" and student.parent_id != user.id:
        raise HTTPException(status_code=403, detail="Not your child")
    if user.role == "teacher" and student.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Not your student")

    analysis = db.query(models.InterventionAnalysis).filter(
        models.InterventionAnalysis.student_id == student_id,
    ).order_by(models.InterventionAnalysis.created_at.desc()).first()

    if not analysis:
        return None

    # Get associated interventions
    interventions = db.query(models.Intervention).filter(
        models.Intervention.analysis_id == analysis.id,
    ).order_by(models.Intervention.created_at.desc()).all()

    return {
        "id": analysis.id,
        "student_id": analysis.student_id,
        "student_name": student.name,
        "student_age": student.age,
        "overall_summary": analysis.overall_summary,
        "improvement_data": analysis.improvement_data,
        "school_readiness": analysis.school_readiness,
        "inclinations": analysis.inclinations,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "interventions": [
            {
                "id": i.id,
                "priority": i.priority,
                "status": i.status,
                "area": i.area,
                "concern": i.concern,
                "recommended_actions": i.recommended_actions,
                "ai_reasoning": i.ai_reasoning,
            }
            for i in interventions
        ],
    }