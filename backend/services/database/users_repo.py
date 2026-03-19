from typing import Dict, Optional

from backend.services.database.client import ensure_success, request_json


def upsert_user(user_id: str, email: str) -> Dict:
    payload = {
        "id": user_id,
        "email": email,
    }
    status, data = request_json(
        "POST",
        "users",
        json_body=payload,
        params={"on_conflict": "id"},
        prefer="resolution=merge-duplicates,return=representation",
    )
    ensure_success(status, data, expected=(200, 201))
    return (data or [{}])[0]


def get_user(user_id: str) -> Optional[Dict]:
    status, data = request_json(
        "GET",
        "users",
        params={"id": f"eq.{user_id}", "select": "id,email,created_at", "limit": 1},
    )
    ensure_success(status, data, expected=(200,))
    rows = data or []
    return rows[0] if rows else None
