import os
import threading
import time
from typing import Dict, List, Tuple

from flask import request

from backend.edge_api.utils.api_response import error_response


_LOCK = threading.Lock()
_HITS: Dict[Tuple[str, str], List[float]] = {}


def _window_seconds() -> int:
    raw = (os.environ.get("RATE_LIMIT_WINDOW_SECONDS") or "60").strip()
    try:
        value = int(raw)
    except ValueError:
        value = 60
    return max(1, value)


def _max_requests() -> int:
    raw = (os.environ.get("RATE_LIMIT_MAX_REQUESTS") or "12").strip()
    try:
        value = int(raw)
    except ValueError:
        value = 12
    return max(1, value)


def _paths() -> List[str]:
    configured = (os.environ.get("RATE_LIMIT_PATHS") or "").strip()
    if configured:
        return [p.strip() for p in configured.split(",") if p.strip()]
    return ["/generate-image-api", "/sketch/generate", "/refine/add", "/transcribe-audio-api"]


def _client_key() -> str:
    forwarded = (request.headers.get("X-Forwarded-For") or "").strip()
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return (request.remote_addr or "unknown").strip()


def register_rate_limiter(app):
    @app.before_request
    def _enforce_rate_limit():
        if request.method == "OPTIONS":
            return None

        path = request.path
        if path not in _paths():
            return None

        window = _window_seconds()
        limit = _max_requests()
        now = time.time()
        key = (_client_key(), path)

        with _LOCK:
            hits = [t for t in _HITS.get(key, []) if now - t <= window]
            if len(hits) >= limit:
                retry_after = int(max(1, window - (now - hits[0])))
                resp, status = error_response(
                    message="Rate limit exceeded for this endpoint.",
                    status_code=429,
                    code="RATE_LIMIT_EXCEEDED",
                    details={"window_seconds": window, "max_requests": limit, "retry_after_seconds": retry_after},
                )
                resp.headers["Retry-After"] = str(retry_after)
                return resp, status

            hits.append(now)
            _HITS[key] = hits

        return None

    return app