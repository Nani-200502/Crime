import os
from typing import Dict, Optional, Tuple

import requests


class AuthConfigError(RuntimeError):
    pass


class AuthError(RuntimeError):
    pass


def _required_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise AuthConfigError(f"{name} is missing in environment.")
    return value


def _auth_base_url() -> str:
    supabase_url = _required_env("SUPABASE_URL").rstrip("/")
    return f"{supabase_url}/auth/v1"


def _anon_key() -> str:
    return _required_env("SUPABASE_ANON_KEY")


def _service_role_key() -> str:
    return _required_env("SUPABASE_SERVICE_ROLE_KEY")


def _auto_confirm_enabled() -> bool:
    return str(os.environ.get("AUTH_AUTO_CONFIRM", "true")).strip().lower() in ("1", "true", "yes", "on")


def _json_headers(access_token: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "apikey": _anon_key(),
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def _admin_headers() -> Dict[str, str]:
    service_key = _service_role_key()
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


def _request_json(method: str, endpoint: str, *, json_body: Optional[dict] = None, timeout: int = 30) -> Tuple[int, dict]:
    url = f"{_auth_base_url()}{endpoint}"
    try:
        response = requests.request(
            method,
            url,
            headers=_json_headers(),
            json=json_body,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        raise AuthError(f"Auth service unreachable: {exc}") from exc

    try:
        data = response.json() if response.content else {}
    except ValueError:
        data = {}

    return response.status_code, data


def _admin_request_json(method: str, endpoint: str, *, json_body: Optional[dict] = None, timeout: int = 30) -> Tuple[int, dict]:
    url = f"{_auth_base_url()}{endpoint}"
    try:
        response = requests.request(
            method,
            url,
            headers=_admin_headers(),
            json=json_body,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        raise AuthError(f"Auth admin service unreachable: {exc}") from exc

    try:
        data = response.json() if response.content else {}
    except ValueError:
        data = {}

    return response.status_code, data


def _error_message(data: dict, fallback: str) -> str:
    return data.get("msg") or data.get("error_description") or data.get("error") or fallback


def _is_email_not_confirmed_message(message: str) -> bool:
    lowered = (message or "").strip().lower()
    return "email not confirmed" in lowered or "not confirmed" in lowered


def _find_user_by_email_admin(email: str) -> Optional[dict]:
    # Early-stage helper: scan admin users list and find by email.
    status, data = _admin_request_json("GET", "/admin/users?page=1&per_page=1000")
    if status >= 400:
        message = _error_message(data, f"HTTP {status}")
        raise AuthError(message)

    users = data.get("users") or []
    target = (email or "").strip().lower()
    for user in users:
        if (user.get("email") or "").strip().lower() == target:
            return user
    return None


def _admin_create_or_confirm_user(email: str, password: str) -> dict:
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
    }

    status, data = _admin_request_json("POST", "/admin/users", json_body=payload)
    if status in (200, 201):
        return data.get("user") or data

    message = _error_message(data, f"HTTP {status}")
    # Existing users are handled by reading and force-confirming below.
    if "already" not in message.lower() and "exists" not in message.lower() and "registered" not in message.lower():
        raise AuthError(message)

    existing = _find_user_by_email_admin(email)
    if not existing:
        raise AuthError("User exists but could not be resolved by email.")

    user_id = (existing.get("id") or "").strip()
    if not user_id:
        raise AuthError("Resolved user is missing id.")

    update_payload = {
        "email_confirm": True,
        "password": password,
    }
    status2, data2 = _admin_request_json("PUT", f"/admin/users/{user_id}", json_body=update_payload)
    if status2 >= 400:
        message2 = _error_message(data2, f"HTTP {status2}")
        raise AuthError(message2)

    return data2.get("user") or data2


def signup(email: str, password: str) -> dict:
    if _auto_confirm_enabled():
        _admin_create_or_confirm_user(email=email, password=password)
        return login(email=email, password=password)

    payload = {
        "email": email,
        "password": password,
    }
    status, data = _request_json("POST", "/signup", json_body=payload)
    if status >= 400:
        message = _error_message(data, f"HTTP {status}")
        raise AuthError(message)
    return data


def login(email: str, password: str) -> dict:
    payload = {
        "email": email,
        "password": password,
    }
    status, data = _request_json("POST", "/token?grant_type=password", json_body=payload)
    if status >= 400:
        message = _error_message(data, f"HTTP {status}")
        if _auto_confirm_enabled() and _is_email_not_confirmed_message(message):
            _admin_create_or_confirm_user(email=email, password=password)
            status, data = _request_json("POST", "/token?grant_type=password", json_body=payload)
            if status < 400:
                return data
            message = _error_message(data, f"HTTP {status}")
        raise AuthError(message)
    return data


def password_reset(email: str) -> dict:
    payload = {"email": email}
    status, data = _request_json("POST", "/recover", json_body=payload)
    if status >= 400:
        message = _error_message(data, f"HTTP {status}")
        raise AuthError(message)
    return data


def verify_access_token(access_token: str, timeout: int = 30) -> dict:
    if not (access_token or "").strip():
        raise AuthError("Missing access token.")

    url = f"{_auth_base_url()}/user"
    headers = _json_headers(access_token=access_token.strip())

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
    except requests.RequestException as exc:
        raise AuthError(f"Auth verification failed: {exc}") from exc

    try:
        data = response.json() if response.content else {}
    except ValueError:
        data = {}

    if response.status_code >= 400:
        message = _error_message(data, "Invalid or expired token.")
        raise AuthError(message)

    return data
