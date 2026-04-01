"""
AI Router — SabahSprout Kindergarten Teacher AI
================================================
Exposes a POST /ai/generate-lesson endpoint that acts as an intelligent
kindergarten teacher backed by Google Gemini and grounded in the
Dokumen Standard Kurikulum dan Pentaksiran (DSKP KSPK Semakan 2017)
curriculum data stored in /data/curriculum/*.json.

Architecture:
  1. Load all DSKP curriculum JSON files once at startup.
  2. On each request, select the most relevant curriculum domains based
     on the teacher's chosen learning area.
  3. Build a structured system prompt that injects the relevant DSKP
     standards as context (lightweight RAG without a vector DB).
  4. Call Gemini via langchain-google-genai and parse the JSON response.
  5. Return a fully structured lesson plan response.
"""

import os
import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

# ---------------------------------------------------------------------------
# Curriculum loader — runs once at import time
# ---------------------------------------------------------------------------

CURRICULUM_DIR = Path(__file__).parent.parent / "data" / "curriculum"

# Map frontend learningArea values → which JSON files are most relevant
AREA_TO_FILES: dict[str, list[str]] = {
    "literacy":   ["lang_and_lit_malay.json", "lang_and_lit_english.json"],
    "numeracy":   ["kognitif.json"],
    "social":     ["sosioemosi.json", "knw_pendidikan_kewarganegaraan.json"],
    "motor":      ["fizikal_dan_kemahiran.json"],
    "creative":   ["kreativiti_dan_estetika.json"],
    "cognitive":  ["kognitif.json", "sosioemosi.json"],
    "moral":      ["knw_pendidikan_moral.json", "knw_pendidikan_islam.json"],
}

# Always include these supplementary files for holistic context
SUPPLEMENTARY_FILES: list[str] = ["sosioemosi.json"]

def _load_curriculum_files(file_names: list[str]) -> list[dict]:
    """Load and parse DSKP JSON files, returning their contents as a list."""
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


def _build_dskp_context(learning_area: str) -> str:
    """
    Build a compact DSKP context string to inject into the system prompt.
    We summarise the domain, skills (SK) and performance standards (SPR)
    to keep the prompt concise while being curriculum-accurate.
    """
    primary_files = AREA_TO_FILES.get(learning_area, list(AREA_TO_FILES["cognitive"]))
    
    # De-duplicate: supplementary files only if not already in primary
    all_files = list(dict.fromkeys(primary_files + SUPPLEMENTARY_FILES))
    curriculum_data = _load_curriculum_files(all_files)

    if not curriculum_data:
        return "No specific DSKP data available; use general KSPK principles."

    lines: list[str] = ["=== DSKP KSPK Semakan 2017 — Relevant Curriculum Standards ==="]

    for domain in curriculum_data:
        overview = domain.get("overview", {})
        domain_name = overview.get("domain", "Unknown Domain")
        lines.append(f"\n## {domain_name}")

        # Summarise skills (kemahiran) and performance standards
        for kn in domain.get("domain_content", []):
            kn_title = kn.get("kn_title", "")
            lines.append(f"\n### {kn.get('kn_code', '')} — {kn_title}")
            for sk in kn.get("kn_component_sks", []):
                sk_code = sk.get("sk_code", "")
                sk_title = sk.get("sk_title", "")
                lines.append(f"  [{sk_code}] {sk_title}")
                for spe in sk.get("sk_component_spes", [])[:3]:  # cap at 3 SPEs
                    spe_code = spe.get("spe_code", "")
                    spe_title = spe.get("spe_title", "")
                    lines.append(f"    • ({spe_code}) {spe_title}")

        # Performance rubrics
        pm = domain.get("performance_metrics", [])
        if pm:
            lines.append("\n  Performance Standards (SPR):")
            for spr in pm[:4]:  # cap at 4 SPRs per domain
                lines.append(f"    [{spr.get('spr_code','')}] {spr.get('spr_title','')}")
                for rubric in spr.get("spr_rubric", []):
                    lines.append(f"      Level {rubric['level']}: {rubric['explanation']}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

LearningArea = Literal[
    "literacy", "numeracy", "social", "motor", "creative", "cognitive", "moral"
]

ScoringType = Literal["percentage", "points"]


class LessonGenerationRequest(BaseModel):
    topic: str = Field(..., min_length=3, description="Lesson topic entered by the teacher")
    age_group: str = Field(default="5-6", description="Target age group, e.g. '5-6'")
    learning_area: LearningArea = Field(default="literacy")
    duration: int = Field(default=30, ge=10, le=120, description="Duration in minutes")
    target_score: int = Field(default=70, ge=0, le=100)
    scoring_type: ScoringType = Field(default="percentage")
    additional_notes: str = Field(default="", description="Any extra teacher notes")


class ActivityStep(BaseModel):
    step: int
    title: str
    description: str
    duration: str


class LessonPlanResponse(BaseModel):
    id: str
    title: str
    age_group: str
    learning_area: str
    duration: str
    target_score: int
    scoring_type: str
    dskp_standards: list[str]
    objectives: list[str]
    materials: list[str]
    activities: list[ActivityStep]
    assessment: str
    adaptations: list[str]
    teacher_notes: str


# ---------------------------------------------------------------------------
# Helper — build the system prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_TEMPLATE = """
You are SabahSprout AI, an expert Malaysian kindergarten teacher and curriculum specialist.
You help teachers design lesson plans that are:
  1. Perfectly aligned with the DSKP KSPK Semakan 2017 curriculum.
  2. Developmentally appropriate for children aged {age_group} years.
  3. Engaging, playful, and culturally relevant to Sabah, Malaysia.
  4. Practical and achievable within the given time limit.

CRITICAL RULES:
- Always cite specific DSKP standard codes (e.g. BM 1.1.2, KO 2.3.1) in the dskp_standards array.
- Every objective must map to at least one DSKP standard.
- Activities must be sequenced logically and respect the time budget of {duration} minutes.
- Use Bahasa Melayu terminology for objectives when appropriate (you can add English in parentheses).
- Materials must be realistic for a typical Sabah kindergarten classroom.
- Adaptations must address diverse learners: visual, kinesthetic, EAL children, and children needing extra support.
- Your entire response MUST be a single valid JSON object following this exact schema:

{{
  "id": "lesson_<unix_timestamp>",
  "title": "<engaging lesson title>",
  "age_group": "{age_group}",
  "learning_area": "{learning_area}",
  "duration": "{duration} minutes",
  "target_score": {target_score},
  "scoring_type": "{scoring_type}",
  "dskp_standards": ["<code1>", "<code2>", ...],
  "objectives": ["<objective1>", "<objective2>", ...],
  "materials": ["<material1>", "<material2>", ...],
  "activities": [
    {{
      "step": 1,
      "title": "<activity name>",
      "description": "<detailed description>",
      "duration": "<X-Y minutes>"
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
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/generate-lesson", response_model=LessonPlanResponse)
async def generate_lesson(request: LessonGenerationRequest):
    """
    Generate a DSKP-aligned kindergarten lesson plan using Gemini.

    The endpoint:
    - Selects relevant DSKP curriculum JSON files based on `learning_area`.
    - Injects them as grounding context into the Gemini system prompt.
    - Parses and validates the structured JSON response.
    - Returns a typed `LessonPlanResponse`.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_API_KEY is not configured. Please add it to the backend .env file."
        )

    # Build DSKP context for the selected learning area
    dskp_context = _build_dskp_context(request.learning_area)

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        age_group=request.age_group,
        duration=request.duration,
        learning_area=request.learning_area,
        target_score=request.target_score,
        scoring_type=request.scoring_type,
        dskp_context=dskp_context,
    )

    user_message = (
        f"Generate a lesson plan for the topic: '{request.topic}'.\n"
        f"Duration: {request.duration} minutes.\n"
        f"Target score / completion: {request.target_score}% ({request.scoring_type}).\n"
    )
    if request.additional_notes.strip():
        user_message += f"Additional teacher notes: {request.additional_notes}\n"

    # Initialise Gemini via LangChain
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0.7,
            max_tokens=4096,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]

        response = await llm.ainvoke(messages)
        raw_text: str = response.content.strip()

    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"AI service error: {str(e)}"
        )

    # Strip markdown fences if model adds them despite instructions
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()
    if raw_text.endswith("```"):
        raw_text = raw_text[: raw_text.rfind("```")].strip()

    # Parse JSON
    try:
        lesson_data = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}\nRaw: {raw_text[:500]}")
        raise HTTPException(
            status_code=500,
            detail="AI returned an invalid response. Please try again."
        )

    # Ensure the id field is set (model sometimes omits the timestamp)
    if not lesson_data.get("id") or lesson_data["id"] == "lesson_<unix_timestamp>":
        import time
        lesson_data["id"] = f"lesson_{int(time.time())}"

    # Validate and return via Pydantic
    try:
        return LessonPlanResponse(**lesson_data)
    except Exception as e:
        logger.error(f"Pydantic validation error: {e}\nData: {lesson_data}")
        raise HTTPException(
            status_code=500,
            detail=f"AI response did not match expected schema: {str(e)}"
        )
