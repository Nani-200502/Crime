from flask import g, request
import logging

from backend.edge_api.utils.api_response import error_response
from backend.services.auth.session_store import get_session_user
from backend.services.auth.supabase_auth import AuthConfigError, AuthError, verify_access_token
from backend.services.database.client import DatabaseConfigError, DatabaseError
from backend.services.database.users_repo import upsert_user


PUBLIC_PATHS = {
    "/",
    "/health",
    "/signup",
    "/reset-password",
    "/dashboard",
    "/create-case",
    "/workspace",
    "/favicon.ico",
    "/robots.txt",
    "/placeholder.svg",
}

LOGGER = logging.getLogger(__name__)


def _extract_bearer_token() -> str:
    auth_header = (request.headers.get("Authorization") or "").strip()
    if not auth_header:
        return ""

    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return ""

    return parts[1].strip()


def register_auth_guard(app):
    @app.before_request
    def _enforce_auth_guard():
        if request.method == "OPTIONS":
            return None

        if (
            request.path in PUBLIC_PATHS
            or request.path.startswith("/auth/")
            or request.path.startswith("/static/")
            or request.path.startswith("/assets/")
        ):
            return None

        token = _extract_bearer_token()
        if not token:
            return error_response("Missing bearer token.", 401, code="MISSING_BEARER_TOKEN")

        # App session tokens are created at login and do not expire while server is running.
        user_data = get_session_user(token)
        if user_data is None:
            try:
                user_data = verify_access_token(token)
            except AuthConfigError as exc:
                return error_response(str(exc), 500, code="AUTH_CONFIG_ERROR")
            except AuthError as exc:
                text = str(exc)
                if "expired" in text.lower():
                    return error_response("Session expired. Please login again.", 401, code="SESSION_EXPIRED")
                return error_response(text, 401, code="AUTH_ERROR")

        g.auth_user = user_data

        # Keep local users table synchronized with authenticated identities.
        user_id = (user_data.get("id") or "").strip()
        user_email = (user_data.get("email") or "").strip()
        if user_id and user_email:
            try:
                upsert_user(user_id=user_id, email=user_email)
            except (DatabaseConfigError, DatabaseError) as exc:
                LOGGER.warning("user_sync_skipped user_id=%s reason=%s", user_id, type(exc).__name__)

        return None

    return app
