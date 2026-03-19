from flask import Blueprint, jsonify, request

from backend.edge_api.utils.api_response import error_response
from backend.schemas.requests import ValidationError, parse_auth_payload, parse_password_reset_payload
from backend.services.auth.session_store import create_session
from backend.services.auth.supabase_auth import AuthConfigError, AuthError, login, password_reset, signup

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/auth/signup")
def auth_signup():
    try:
        payload = parse_auth_payload(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return error_response(str(exc), 400, code="VALIDATION_ERROR", details=exc.details)

    try:
        out = signup(email=payload["email"], password=payload["password"])
    except AuthConfigError as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
    except AuthError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    app_session_token = ""
    user = out.get("user") or {}
    if user:
        app_session_token = create_session(user)

    return jsonify(
        {
            "success": True,
            "user": user,
            "session": out.get("session") or None,
            "access_token": out.get("access_token", ""),
            "session_token": app_session_token,
            "refresh_token": out.get("refresh_token", ""),
            "expires_in": out.get("expires_in"),
            "token_type": out.get("token_type", "bearer"),
        }
    )


@auth_bp.post("/auth/login")
def auth_login():
    try:
        payload = parse_auth_payload(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return error_response(str(exc), 400, code="VALIDATION_ERROR", details=exc.details)

    try:
        out = login(email=payload["email"], password=payload["password"])
    except AuthConfigError as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
    except AuthError as exc:
        return jsonify({"success": False, "error": str(exc)}), 401

    app_session_token = ""
    user = out.get("user") or {}
    if user:
        app_session_token = create_session(user)

    return jsonify(
        {
            "success": True,
            "access_token": out.get("access_token", ""),
            "session_token": app_session_token,
            "refresh_token": out.get("refresh_token", ""),
            "expires_in": out.get("expires_in"),
            "token_type": out.get("token_type", "bearer"),
            "user": user,
        }
    )


@auth_bp.post("/auth/password-reset")
def auth_password_reset():
    try:
        payload = parse_password_reset_payload(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return error_response(str(exc), 400, code="VALIDATION_ERROR", details=exc.details)

    try:
        password_reset(email=payload["email"])
    except AuthConfigError as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
    except AuthError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    return jsonify({"success": True, "message": "Password reset email requested."})
