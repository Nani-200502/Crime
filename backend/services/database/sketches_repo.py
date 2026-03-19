from typing import Dict, List, Optional
from uuid import uuid4

from backend.services.database.client import ensure_success, request_json


def get_latest_version(case_id: str) -> int:
    status, data = request_json(
        "GET",
        "sketches",
        params={
            "case_id": f"eq.{case_id}",
            "select": "version",
            "order": "version.desc",
            "limit": 1,
        },
    )
    ensure_success(status, data, expected=(200,))
    rows = data or []
    if not rows:
        return 0
    return int(rows[0].get("version") or 0)


def create_sketch(case_id: str, image_url: str, version: Optional[int] = None, sketch_id: Optional[str] = None) -> Dict:
    resolved_version = int(version if version is not None else (get_latest_version(case_id) + 1))
    payload = {
        "sketch_id": sketch_id or uuid4().hex,
        "case_id": case_id,
        "image_url": image_url,
        "version": resolved_version,
    }
    status, data = request_json(
        "POST",
        "sketches",
        json_body=payload,
        prefer="return=representation",
    )
    ensure_success(status, data, expected=(201,))
    return (data or [{}])[0]


def list_case_sketches(case_id: str) -> List[Dict]:
    status, data = request_json(
        "GET",
        "sketches",
        params={
            "case_id": f"eq.{case_id}",
            "select": "sketch_id,case_id,image_url,version,created_at",
            "order": "version.desc",
        },
    )
    ensure_success(status, data, expected=(200,))
    return data or []
