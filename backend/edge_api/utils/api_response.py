from typing import Any, Dict, Optional

from flask import g, jsonify


def _request_id() -> str:
    return (getattr(g, "request_id", "") or "").strip()


def success_response(payload: Optional[Dict[str, Any]] = None, status_code: int = 200):
    body: Dict[str, Any] = {"success": True, "request_id": _request_id()}
    if payload:
        body.update(payload)
    return jsonify(body), status_code


def error_response(message: str, status_code: int, code: str = "ERROR", details: Optional[Dict[str, Any]] = None):
    model: Dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": _request_id(),
    }
    if details:
        model["details"] = details

    body = {
        "success": False,
        # Keep legacy key for current frontend compatibility.
        "error": message,
        "error_model": model,
        "request_id": _request_id(),
    }
    return jsonify(body), status_code