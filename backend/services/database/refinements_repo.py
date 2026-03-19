from typing import Dict, List, Optional
from uuid import uuid4

from backend.services.database.client import ensure_success, request_json


def create_refinement(
    case_id: str,
    attribute_type: str,
    description: str,
    x_coord: Optional[float] = None,
    y_coord: Optional[float] = None,
    refine_id: Optional[str] = None,
) -> Dict:
    payload = {
        "refine_id": refine_id or uuid4().hex,
        "case_id": case_id,
        "attribute_type": (attribute_type or "").strip(),
        "description": (description or "").strip(),
        "x_coord": x_coord,
        "y_coord": y_coord,
    }
    status, data = request_json(
        "POST",
        "refinements",
        json_body=payload,
        prefer="return=representation",
    )
    ensure_success(status, data, expected=(201,))
    return (data or [{}])[0]


def list_refinements(case_id: str) -> List[Dict]:
    status, data = request_json(
        "GET",
        "refinements",
        params={
            "case_id": f"eq.{case_id}",
            "select": "refine_id,case_id,attribute_type,description,x_coord,y_coord,created_at",
            "order": "created_at.desc",
        },
    )
    ensure_success(status, data, expected=(200,))
    return data or []
