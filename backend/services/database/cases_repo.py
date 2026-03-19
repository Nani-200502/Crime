from typing import Dict, List, Optional
from uuid import uuid4

from backend.services.database.client import ensure_success, request_json


def create_case(user_id: str, title: str, description: str = "", case_id: Optional[str] = None) -> Dict:
    payload = {
        "case_id": case_id or uuid4().hex,
        "user_id": user_id,
        "title": (title or "Untitled Case").strip() or "Untitled Case",
        "description": (description or "").strip(),
    }
    status, data = request_json(
        "POST",
        "cases",
        json_body=payload,
        prefer="return=representation",
    )
    ensure_success(status, data, expected=(201,))
    return (data or [{}])[0]


def list_cases(user_id: str) -> List[Dict]:
    status, data = request_json(
        "GET",
        "cases",
        params={
            "user_id": f"eq.{user_id}",
            "select": "case_id,user_id,title,description,created_at",
            "order": "created_at.desc",
        },
    )
    ensure_success(status, data, expected=(200,))
    return data or []


def get_case(case_id: str, user_id: str) -> Optional[Dict]:
    status, data = request_json(
        "GET",
        "cases",
        params={
            "case_id": f"eq.{case_id}",
            "user_id": f"eq.{user_id}",
            "select": "case_id,user_id,title,description,created_at",
            "limit": 1,
        },
    )
    ensure_success(status, data, expected=(200,))
    rows = data or []
    return rows[0] if rows else None
