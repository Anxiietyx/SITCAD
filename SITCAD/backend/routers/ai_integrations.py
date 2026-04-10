import os
import json
import time
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
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


def _is_503_error(exc: Exception) -> bool:
    """Return True if the exception is a transient 503/UNAVAILABLE error from Gemini."""
    err = str(exc)
    return "503" in err or "UNAVAILABLE" in err or "high demand" in err.lower()


async def _invoke_with_retry(llm, messages, max_retries: int = 3, base_delay: float = 5.0):
    """
    Invoke an LLM with exponential-backoff retry specifically for 503 UNAVAILABLE errors.
    Non-retriable errors are raised immediately.
    Raises the last exception if all retries are exhausted.
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            return await llm.ainvoke(messages)
        except Exception as exc:
            if _is_503_error(exc):
                last_exc = exc
                delay = base_delay * (2 ** attempt)   # 5 s, 10 s, 20 s
                logger.warning(
                    "Gemini 503 on attempt %d/%d, retrying in %.0fs: %s",
                    attempt + 1, max_retries, delay, exc,
                )
                await asyncio.sleep(delay)
            else:
                raise  # fail fast for non-retriable errors
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


ActivityType = Literal["quiz", "image", "story"]


class ActivityToGenerate(BaseModel):
    title: str
    description: str
    duration: str = ""
    type: ActivityType = "quiz"


class GenerateActivitiesRequest(BaseModel):
    id_token: str
    lesson_plan_id: str
    lesson_title: str = ""
    topic: str = ""
    learning_area: str = ""
    age_group: str = "5"
    language: Literal["bm", "en"] = "bm"
    activities: list[ActivityToGenerate] = Field(..., min_length=1)


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
        response = await _invoke_with_retry(llm, [
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


# ---------------------------------------------------------------------------
# Activity generation system prompts
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
  • Begin with: "Bright colorful cartoon illustration, children's educational style, simple and cheerful,"
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
- The "image_prompt" must be a concise, vivid English description optimised for photorealistic image generation.
  • Begin with: "Ultra-realistic photograph, bright natural lighting, vibrant colors, sharp focus, educational."
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

# Fixed illustration style for all story page images — matches the target child-friendly cartoon aesthetic.
STORY_IMAGE_STYLE = (
    "Bright, colorful flat vector cartoon illustration in a children's educational storybook style, "
    "bold black outlines, vibrant saturated colors, round-faced Southeast Asian child characters with "
    "big expressive eyes and rosy cheeks, clean detailed backgrounds, smooth cel-shading, "
    "fully visible characters within frame, no text or watermarks."
)

STORY_SYSTEM_PROMPT = """\
You are SabahSprout AI, writing a short, engaging story for kindergarten children aged {age_group} years.
The story supports a lesson: "{lesson_title}" (topic: {topic}, area: {learning_area}).

LANGUAGE REQUIREMENT (STRICT — NO EXCEPTIONS):
- Every piece of text you generate MUST be written entirely in {language_label}.
- This includes: the story title, all page text, vocabulary words and definitions, and the moral.
- Do NOT mix languages. Do NOT use any other language, not even for a single word.
- If {language_label} is English, write everything in English only. If Bahasa Malaysia, write everything in Bahasa Malaysia only.

RULES:
- Write a short story with exactly {num_pages} pages (each page is 2-4 sentences of simple language).
- The story must be age-appropriate, engaging, and teach the relevant concept.
- Include a simple moral or learning outcome.
- Characters should be relatable to children in Sabah, Malaysia.
- Include 3-5 vocabulary words with simple definitions.
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
# Activity generation helpers
# ---------------------------------------------------------------------------

def _handle_response_content(content) -> str:
    """Normalise Gemini response content (handles list vs string formats)."""
    if isinstance(content, list):
        return "".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in content)
    return str(content).strip()


IMAGEN_MODEL = "imagen-4.0-fast-generate-001"


async def _generate_flashcard_images(
    image_metadata: list[dict],
    api_key: str,
    aspect_ratio: str = "1:1",
) -> list[dict]:
    """
    Generate images via Imagen 4, upload to Firebase Storage,
    and return public URLs instead of base64 blobs.
    """
    from google import genai as ggenai
    from google.genai import types as gtypes
    from firebase_admin import storage

    imagen_client = ggenai.Client(api_key=api_key)
    bucket = storage.bucket()
    loop = asyncio.get_event_loop()

    async def _gen_one(img_data: dict) -> dict:
        prompt = img_data.get("image_prompt", img_data.get("label", ""))
        image_url = None
        try:
            resp = await loop.run_in_executor(
                None,
                lambda: imagen_client.models.generate_images(
                    model=IMAGEN_MODEL,
                    prompt=prompt,
                    config=gtypes.GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio=aspect_ratio,
                    ),
                ),
            )
            image_bytes = resp.generated_images[0].image.image_bytes
            blob_name = f"activity-images/{uuid.uuid4()}.png"
            blob = bucket.blob(blob_name)
            blob.upload_from_string(image_bytes, content_type="image/png")
            blob.make_public()
            image_url = blob.public_url
        except Exception as exc:
            logger.warning(f"Imagen generation failed for '{img_data.get('label')}': {exc}")

        return {
            "label": img_data.get("label", ""),
            "image_url": image_url,
            "learning_point": img_data.get("learning_point", ""),
        }

    results = await asyncio.gather(*[_gen_one(img) for img in image_metadata])
    return list(results)


async def _generate_single_activity(
    activity: ActivityToGenerate,
    lesson_title: str,
    topic: str,
    learning_area: str,
    age_group: str,
    language: str,
    llm: ChatGoogleGenerativeAI,
    api_key: str,
) -> dict:
    """Generate content for a single activity based on its type."""
    language_label = "English" if language == "en" else "Bahasa Malaysia"
    common_vars = dict(
        age_group=age_group,
        lesson_title=lesson_title,
        topic=topic,
        learning_area=learning_area,
        language_label=language_label,
    )

    if activity.type == "quiz":
        system_prompt = QUIZ_SYSTEM_PROMPT.format(num_questions=5, **common_vars)
    elif activity.type == "image":
        system_prompt = IMAGE_SYSTEM_PROMPT.format(num_images=4, **common_vars)
    elif activity.type == "story":
        system_prompt = STORY_SYSTEM_PROMPT.format(num_pages=5, **common_vars)
    else:
        raise ValueError(f"Unknown activity type: {activity.type}")

    user_message = (
        f"Activity: {activity.title}\n"
        f"Description: {activity.description}\n"
        f"Generate the content now."
    )

    response = await _invoke_with_retry(llm, [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ])
    raw = _handle_response_content(response.content)
    raw = _strip_json_fences(raw)

    try:
        content_data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse activity JSON ({activity.type}): {e}\nRaw: {raw[:500]}")
        raise ValueError(f"AI returned invalid JSON for activity '{activity.title}'")

    # For image activities: generate actual images with Imagen 4
    if activity.type == "image" and content_data.get("images"):
        content_data["images"] = await _generate_flashcard_images(
            content_data["images"], api_key
        )

    # For quiz activities: generate one image per question with Imagen 4
    if activity.type == "quiz" and content_data.get("questions"):
        questions_with_prompts = [
            {
                "image_prompt": q.get("image_prompt", ""),
                "label": f"Q{i+1}",
                "learning_point": "",
            }
            for i, q in enumerate(content_data["questions"])
            if q.get("image_prompt")
        ]
        if questions_with_prompts:
            generated = await _generate_flashcard_images(questions_with_prompts, api_key, aspect_ratio="1:1")
            gen_iter = iter(generated)
            for q in content_data["questions"]:
                if q.get("image_prompt"):
                    q["image_url"] = next(gen_iter).get("image_url")
                    # Remove the prompt from final output
                    q.pop("image_prompt", None)

    # For story activities: generate one image per page with Imagen 4
    if activity.type == "story" and content_data.get("pages"):
        pages_with_prompts = [
            {
                "image_prompt": f"{STORY_IMAGE_STYLE} {p.get('image_prompt', '')}".strip(),
                "label": f"Page {p.get('page_number', i+1)}",
                "learning_point": "",
            }
            for i, p in enumerate(content_data["pages"])
            if p.get("image_prompt")
        ]
        if pages_with_prompts:
            generated = await _generate_flashcard_images(pages_with_prompts, api_key, aspect_ratio="1:1")
            # Map results back onto pages by order
            gen_iter = iter(generated)
            for page in content_data["pages"]:
                if page.get("image_prompt"):
                    page["image_url"] = next(gen_iter).get("image_url")

    return {
        "title": activity.title,
        "description": activity.description,
        "type": activity.type,
        "duration": activity.duration,
        "generated_content": content_data,
    }


# ---------------------------------------------------------------------------
# Activity generation endpoint
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

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")

    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        api_key=gemini_api_key,
        temperature=0.7,
        max_tokens=4096,
    )

    # Fan out — generate all activities concurrently
    tasks = [
        _generate_single_activity(
            activity=act,
            lesson_title=request.lesson_title or plan.title,
            topic=request.topic or plan.topic,
            learning_area=request.learning_area or plan.learning_area,
            age_group=request.age_group,
            language=request.language,
            llm=llm,
            api_key=gemini_api_key,
        )
        for act in request.activities
    ]

    try:
        results = await asyncio.gather(*tasks)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Activity generation failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    return {
        "lesson_plan_id": request.lesson_plan_id,
        "generated": list(results),
    }


# ---------------------------------------------------------------------------
# Activity analysis (Phase 3 – AI Insights)
# ---------------------------------------------------------------------------

class AnalyzeActivityRequest(BaseModel):
    id_token: str
    activity_id: str


def _resolve_spr_context(learning_area: str, dskp_standards: list[dict]) -> str:
    """
    Given the LP's DSKP standards (list of {code, title}), load the relevant
    curriculum files and build a context string containing only the SPR rubrics
    that map to those standards.

    Resolution: SPE code (e.g. BI 1.1.1) → SK code (BI 1.1) → SPR (BI 1).
    """
    primary_files = list(AREA_TO_FILES.get(learning_area, AREA_TO_FILES["cognitive"]))
    curriculum_data = _load_curriculum_files(primary_files)
    if not curriculum_data or not dskp_standards:
        return ""

    # Extract SPE codes from the LP's dskp_standards
    spe_codes: set[str] = set()
    for std in dskp_standards:
        code = std.get("code", "") if isinstance(std, dict) else str(std)
        if code:
            spe_codes.add(code.strip())

    # Derive parent SK codes by trimming trailing .N
    sk_codes: set[str] = set()
    for spe in spe_codes:
        parts = spe.rsplit(".", 1)
        if len(parts) == 2:
            sk_codes.add(parts[0])

    # Find matching SPRs
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

    # Also include the targeted SPE details for richer context
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

    # If re-running, delete the old report
    if activity.analysis_status in ("completed", "failed"):
        old_reports = db.query(models.Report).filter(
            models.Report.activity_id == activity.id,
        ).all()
        for old in old_reports:
            db.query(models.ReportStudent).filter(models.ReportStudent.report_id == old.id).delete()
            db.delete(old)
        db.flush()

    # Mark as analyzing
    activity.analysis_status = "analyzing"
    activity.analysis_error = None
    db.commit()

    # Gather context
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

    # Build SPR context from curriculum
    spr_context = _resolve_spr_context(
        activity.learning_area or (lesson_plan.learning_area if lesson_plan else "cognitive"),
        dskp_standards,
    )

    # Build the user message with all activity data
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

    # Include the generated content (questions/cards/pages) but strip images to save tokens
    if activity.generated_content:
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

    # Call Gemini
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        activity.analysis_status = "failed"
        activity.analysis_error = "GEMINI_API_KEY not configured"
        db.commit()
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")

    try:
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            api_key=gemini_api_key,
            temperature=0.3,
            max_tokens=4096,
        )
        response = await _invoke_with_retry(llm, [
            SystemMessage(content=ANALYSIS_SYSTEM_PROMPT),
            HumanMessage(content=user_message),
        ])
        raw = _handle_response_content(response.content)
        raw = _strip_json_fences(raw)
        insights = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse analysis JSON: {e}\nRaw: {raw[:500]}")
        activity.analysis_status = "failed"
        activity.analysis_error = "AI returned invalid JSON"
        db.commit()
        raise HTTPException(status_code=500, detail="AI returned an invalid response. Try re-running.")
    except Exception as e:
        logger.error(f"Analysis Gemini call failed: {e}")
        if _is_503_error(e):
            # Gemini is overloaded — generate a basic fallback report rather than failing
            logger.info("Gemini 503 persisted after retries; generating fallback analysis")
            insights = _generate_fallback_insights(
                activity, activity.results_data or {}, students, dskp_standards
            )
        else:
            activity.analysis_status = "failed"
            activity.analysis_error = str(e)[:500]
            db.commit()
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Build report details combining raw data + AI insights
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

    report = models.Report(
        id=str(uuid.uuid4()),
        teacher_id=teacher.id,
        activity_id=activity.id,
        title=f"AI Insights: {activity.title}",
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

    # ── Auto-trigger Intervention Analysis for each student ──
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
            # Roll back any aborted transaction so the session is clean for the next student
            try:
                db.rollback()
            except Exception:
                pass
            il_results.append({"student_id": s.id, "error": str(e)})

    return {
        "activity_id": activity.id,
        "analysis_status": "completed",
        "report_id": report.id,
        "insights": insights,
        "intervention_analyses": il_results,
    }


def _strip_images_for_analysis(content: dict) -> dict:
    """Remove image data/URLs from generated content to reduce token usage."""
    import copy
    stripped = copy.deepcopy(content)
    # Strip from flashcard images
    for img in stripped.get("images", []):
        img.pop("image_b64", None)
        img.pop("image_url", None)
    # Strip from story pages
    for page in stripped.get("pages", []):
        page.pop("image_b64", None)
        page.pop("image_url", None)
    # Strip from quiz question images
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
    Core intervention analysis logic (per-student).
    Gathers payloads A/B/C, calls Gemini, persists InterventionAnalysis + Intervention records.
    Returns the parsed AI result dict.
    """
    # Payload C: DSKP SPR scores
    progress_records = db.query(models.StudentProgress).filter(
        models.StudentProgress.student_id == student.id
    ).all()
    spr_scores = [
        {"domain_key": p.domain_key, "spr_code": p.spr_code, "level": p.level}
        for p in progress_records
    ]

    # Payload A + B: Reports involving this student
    report_student_links = db.query(models.ReportStudent).filter(
        models.ReportStudent.student_id == student.id
    ).all()
    report_ids = [rl.report_id for rl in report_student_links]

    current_report_data = None
    historical_reports = []

    if report_ids:
        report_rows = db.query(models.Report).filter(
            models.Report.id.in_(report_ids)
        ).order_by(models.Report.created_at.desc()).limit(15).all()

        for r in report_rows:
            report_data = {
                "report_id": r.id,
                "title": r.title,
                "summary": r.summary,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            if r.details:
                report_data["ai_insights"] = r.details.get("ai_insights")
                report_data["results_summary"] = r.details.get("results_summary")
                report_data["activity_type"] = r.details.get("activity_type")
                report_data["learning_area"] = r.details.get("learning_area")
            # Payload A = trigger report or most recent
            if trigger_report_id and r.id == trigger_report_id:
                current_report_data = report_data
            else:
                historical_reports.append(report_data)

        # If no explicit trigger report, use most recent as current
        if current_report_data is None and report_rows:
            first = report_rows[0]
            current_report_data = {
                "report_id": first.id,
                "title": first.title,
                "summary": first.summary,
                "created_at": first.created_at.isoformat() if first.created_at else None,
            }
            if first.details:
                current_report_data["ai_insights"] = first.details.get("ai_insights")
                current_report_data["results_summary"] = first.details.get("results_summary")
                current_report_data["activity_type"] = first.details.get("activity_type")
                current_report_data["learning_area"] = first.details.get("learning_area")
            # Remove it from historical if it ended up there
            historical_reports = [h for h in historical_reports if h.get("report_id") != first.id]

    if not current_report_data and not spr_scores:
        # Nothing to analyse — skip silently
        return {"skipped": True, "reason": "No performance data available"}

    # Payload D: Prior interventions (so AI knows what was already flagged/resolved)
    prior_interventions_data = []
    prior_interventions = db.query(models.Intervention).filter(
        models.Intervention.student_id == student.id,
        models.Intervention.teacher_id == teacher_id,
    ).order_by(models.Intervention.created_at.desc()).all()
    for pi in prior_interventions:
        prior_interventions_data.append({
            "area": pi.area,
            "concern": pi.concern,
            "priority": pi.priority,
            "status": pi.status,
            "recommended_actions": pi.recommended_actions or [],
            "created_at": pi.created_at.isoformat() if pi.created_at else None,
            "resolved_at": pi.resolved_at.isoformat() if pi.resolved_at else None,
        })

    # Build user message
    student_info = {"name": student.name, "age": student.age}
    user_parts = [f"=== Student Profile ===\n{json.dumps(student_info, indent=2)}"]

    if current_report_data:
        user_parts.append(f"\n=== Payload A: Current Report ===\n{json.dumps(current_report_data, indent=2)}")

    if historical_reports:
        user_parts.append(f"\n=== Payload B: Historical Reports (most recent first, up to 14) ===\n{json.dumps(historical_reports, indent=2)}")

    if spr_scores:
        user_parts.append(f"\n=== Payload C: DSKP SPR Attainment Scores ===\n{json.dumps(spr_scores, indent=2)}")

    if prior_interventions_data:
        user_parts.append(f"\n=== Payload D: Prior Interventions ===\n{json.dumps(prior_interventions_data, indent=2)}")

    user_message = "\n".join(user_parts)

    # Call Gemini
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured.")

    try:
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            api_key=gemini_api_key,
            temperature=0.3,
            max_tokens=6144,
        )
        response = await _invoke_with_retry(llm, [
            SystemMessage(content=INTERVENTION_SYSTEM_PROMPT),
            HumanMessage(content=user_message),
        ])
        raw = _handle_response_content(response.content)
        raw = _strip_json_fences(raw)
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse intervention JSON: {e}\nRaw: {raw[:500]}")
        raise HTTPException(status_code=500, detail="AI returned an invalid response. Try again.")
    except Exception as e:
        logger.error(f"Intervention analysis failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Delete existing analysis + interventions for this student by this teacher (replace with fresh)
    old_analyses = db.query(models.InterventionAnalysis).filter(
        models.InterventionAnalysis.student_id == student.id,
        models.InterventionAnalysis.teacher_id == teacher_id,
    ).all()
    old_analysis_ids = [a.id for a in old_analyses]

    if old_analysis_ids:
        db.query(models.Intervention).filter(
            models.Intervention.analysis_id.in_(old_analysis_ids)
        ).delete(synchronize_session=False)
        db.query(models.InterventionAnalysis).filter(
            models.InterventionAnalysis.id.in_(old_analysis_ids)
        ).delete(synchronize_session=False)
    # Also delete any legacy interventions without analysis_id
    db.query(models.Intervention).filter(
        models.Intervention.student_id == student.id,
        models.Intervention.teacher_id == teacher_id,
        models.Intervention.analysis_id == None,
    ).delete(synchronize_session=False)
    db.flush()

    # Create InterventionAnalysis record
    analysis_id = str(uuid.uuid4())
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
    db.flush()

    # Persist individual interventions
    created_interventions = []
    for item in result.get("interventions", []):
        intervention = models.Intervention(
            id=str(uuid.uuid4()),
            teacher_id=teacher_id,
            student_id=student.id,
            analysis_id=analysis_id,
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

    # Update student's needs_intervention flag
    has_concerns = any(
        item.get("priority") in ("high", "medium")
        for item in result.get("interventions", [])
    )
    student.needs_intervention = has_concerns
    db.commit()

    return {
        "student_id": student.id,
        "student_name": student.name,
        "analysis_id": analysis_id,
        "overall_summary": result.get("overall_summary", ""),
        "improvement_data": result.get("improvement_data"),
        "school_readiness": result.get("school_readiness"),
        "interventions": result.get("interventions", []),
        "inclinations": result.get("inclinations", []),
        "intervention_count": len(created_interventions),
        "needs_intervention": has_concerns,
    }


@router.post("/generate-interventions")
async def generate_interventions(request: GenerateInterventionsRequest, db: Session = Depends(get_db)):
    """
    Analyse a student's holistic performance data across all activities/reports
    and generate AI-powered intervention recommendations.
    Can be triggered manually by teacher or auto-triggered after activity analysis.
    """
    teacher = _verify_teacher(request.id_token, db)

    student = db.query(models.Student).filter(
        models.Student.id == request.student_id,
        models.Student.teacher_id == teacher.id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or not assigned to you")

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