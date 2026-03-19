from flask import Blueprint, g, jsonify, request

from backend.edge_api.utils.api_response import error_response
from backend.schemas.requests import ValidationError, parse_create_case_payload
from backend.services.database.cases_repo import create_case, get_case, list_cases
from backend.services.database.client import DatabaseConfigError, DatabaseError

cases_bp = Blueprint("cases", __name__)


def _current_user_id() -> str:
    user = getattr(g, "auth_user", {}) or {}
    return (user.get("id") or "").strip()


@cases_bp.post("/cases/create")
def create_case_route():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized user context."}), 401

    try:
        payload = parse_create_case_payload(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return error_response(str(exc), 400, code="VALIDATION_ERROR", details=exc.details)

    try:
        row = create_case(
            user_id=user_id,
            title=payload["title"] or "",
            description=payload["description"] or "",
            case_id=payload["case_id"],
        )
    except (DatabaseConfigError, DatabaseError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify({"success": True, "case": row}), 201


@cases_bp.get("/cases/list")
def list_cases_route():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized user context."}), 401

    try:
        rows = list_cases(user_id=user_id)
    except (DatabaseConfigError, DatabaseError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify({"success": True, "cases": rows})


@cases_bp.get("/cases/<case_id>")
def get_case_route(case_id: str):
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized user context."}), 401

    try:
        row = get_case(case_id=case_id, user_id=user_id)
    except (DatabaseConfigError, DatabaseError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    if not row:
        return jsonify({"success": False, "error": "Case not found."}), 404

    return jsonify({"success": True, "case": row})
