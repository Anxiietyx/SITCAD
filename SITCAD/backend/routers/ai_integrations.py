import os
import json
import time
import uuid
import base64
import asyncio
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

RULES:
- Generate exactly {num_questions} multiple-choice questions.
- Each question must have exactly 4 options (A, B, C, D).
- Questions must be simple and suitable for {age_group}-year-old children who are still learning to read.
- Make every question EASY and OBVIOUS: the correct answer should be clearly identifiable, and the wrong options (distractors) should be clearly and unmistakably different from the correct answer.
- Use very simple, short vocabulary. Avoid tricky wording or close distractors.
- Include a short, encouraging explanation for the correct answer.
- Return ONLY a single valid JSON object with this schema:

{{
  "questions": [
    {{
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correct_answer": <0-3 index>,
      "explanation": "<short explanation>"
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
    Generate actual images for each flashcard entry using Imagen 4.
    Returns the same list with an added "image_b64" field (base64 PNG).
    Falls back gracefully if image generation fails.
    """
    from google import genai as ggenai
    from google.genai import types as gtypes

    imagen_client = ggenai.Client(api_key=api_key)
    loop = asyncio.get_event_loop()

    async def _gen_one(img_data: dict) -> dict:
        prompt = img_data.get("image_prompt", img_data.get("label", ""))
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
            img_b64 = base64.b64encode(resp.generated_images[0].image.image_bytes).decode("utf-8")
        except Exception as exc:
            logger.warning(f"Imagen generation failed for '{img_data.get('label')}': {exc}")
            img_b64 = None

        return {
            "label": img_data.get("label", ""),
            "image_b64": img_b64,
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

    response = await llm.ainvoke([
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
                    page["image_b64"] = next(gen_iter).get("image_b64")

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
        response = await llm.ainvoke([
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

    return {
        "activity_id": activity.id,
        "analysis_status": "completed",
        "report_id": report.id,
        "insights": insights,
    }


def _strip_images_for_analysis(content: dict) -> dict:
    """Remove base64 image data from generated content to reduce token usage."""
    import copy
    stripped = copy.deepcopy(content)
    # Strip from flashcard images
    for img in stripped.get("images", []):
        img.pop("image_b64", None)
    # Strip from story pages
    for page in stripped.get("pages", []):
        page.pop("image_b64", None)
    return stripped