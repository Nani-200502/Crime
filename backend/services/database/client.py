import os
import time
import logging
from typing import Any, Dict, Optional, Tuple

import requests
from flask import g, has_request_context


class DatabaseConfigError(RuntimeError):
    pass


class DatabaseError(RuntimeError):
    pass


LOGGER = logging.getLogger(__name__)


def _required_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise DatabaseConfigError(f"{name} is missing in environment.")
    return value


def _base_rest_url() -> str:
    supabase_url = _required_env("SUPABASE_URL").rstrip("/")
    return f"{supabase_url}/rest/v1"


def _service_role_key() -> str:
    return _required_env("SUPABASE_SERVICE_ROLE_KEY")


def _headers(prefer: Optional[str] = None) -> Dict[str, str]:
    service_key = _service_role_key()
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _query_logging_enabled() -> bool:
    value = (os.environ.get("DB_QUERY_LOG_ENABLED") or "true").strip().lower()
    return value in ("1", "true", "yes", "on")


def _request_id() -> str:
    if not has_request_context():
        return ""
    return (getattr(g, "request_id", "") or "").strip()


def _body_keys(json_body: Optional[dict]) -> str:
    if not isinstance(json_body, dict):
        return ""
    return ",".join(sorted(str(k) for k in json_body.keys()))


def _param_keys(params: Optional[dict]) -> str:
    if not isinstance(params, dict):
        return ""
    return ",".join(sorted(str(k) for k in params.keys()))


def request_json(
    method: str,
    path: str,
    *,
    json_body: Optional[dict] = None,
    params: Optional[dict] = None,
    prefer: Optional[str] = None,
    timeout: int = 30,
) -> Tuple[int, Any]:
    url = f"{_base_rest_url()}/{path.lstrip('/')}"
    started_at = time.perf_counter()
    try:
        response = requests.request(
            method,
            url,
            headers=_headers(prefer=prefer),
            json=json_body,
            params=params,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        if _query_logging_enabled():
            elapsed_ms = int((time.perf_counter() - started_at) * 1000)
            LOGGER.warning(
                "db_request_failed request_id=%s method=%s path=%s duration_ms=%s param_keys=%s body_keys=%s error=%s",
                _request_id(),
                method.upper(),
                path,
                elapsed_ms,
                _param_keys(params),
                _body_keys(json_body),
                type(exc).__name__,
            )
        raise DatabaseError(f"Database service unreachable: {exc}") from exc

    content_type = (response.headers.get("Content-Type") or "").lower()
    if "application/json" in content_type:
        try:
            data = response.json()
        except ValueError:
            data = None
    else:
        data = response.text

    if _query_logging_enabled():
        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        LOGGER.info(
            "db_request request_id=%s method=%s path=%s status=%s duration_ms=%s param_keys=%s body_keys=%s",
            _request_id(),
            method.upper(),
            path,
            response.status_code,
            elapsed_ms,
            _param_keys(params),
            _body_keys(json_body),
        )

    return response.status_code, data


def ensure_success(status_code: int, data: Any, expected: Tuple[int, ...] = (200, 201, 204)) -> None:
    if status_code in expected:
        return

    if isinstance(data, dict):
        message = data.get("message") or data.get("hint") or data.get("details") or str(data)
    else:
        message = str(data)
    raise DatabaseError(f"Database operation failed (HTTP {status_code}): {message}")
