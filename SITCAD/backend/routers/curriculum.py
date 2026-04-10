import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

CURRICULUM_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "curriculum")

# Map of filename stems to serve
CURRICULUM_FILES = {
    "sosioemosi": "sosioemosi.json",
    "kognitif": "kognitif.json",
    "fizikal_dan_kemahiran": "fizikal_dan_kemahiran.json",
    "kreativiti_dan_estetika": "kreativiti_dan_estetika.json",
    "lang_and_lit_malay": "lang_and_lit_malay.json",
    "lang_and_lit_english": "lang_and_lit_english.json",
    "knw_pendidikan_islam": "knw_pendidikan_islam.json",
    "knw_pendidikan_moral": "knw_pendidikan_moral.json",
    "knw_pendidikan_kewarganegaraan": "knw_pendidikan_kewarganegaraan.json",
}


def _load_json(filename: str):
    filepath = os.path.join(CURRICULUM_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/domains")
async def list_domains():
    """Return overview info for every curriculum domain."""
    domains = []
    for key, filename in CURRICULUM_FILES.items():
        try:
            data = _load_json(filename)
            overview = data.get("overview", {})
            spr_count = len(data.get("performance_metrics", []))
            domains.append({
                "key": key,
                "domain": overview.get("domain"),
                "domain_identifier": overview.get("domain_identifier"),
                "description": overview.get("description", {}),
                "spr_count": spr_count,
            })
        except FileNotFoundError:
            continue
    return domains


@router.get("/domains/{domain_key}")
async def get_domain(domain_key: str):
    """Return full curriculum data for a single domain."""
    filename = CURRICULUM_FILES.get(domain_key)
    if not filename:
        raise HTTPException(status_code=404, detail="Domain not found")
    try:
        return _load_json(filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Domain data file not found")
