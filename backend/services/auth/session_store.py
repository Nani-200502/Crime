import json
import os
import secrets
import threading
from pathlib import Path
from typing import Dict, Optional


_LOCK = threading.Lock()
_SESSIONS: Dict[str, Dict] = {}


def _store_path() -> Path:
    configured = (os.environ.get("APP_SESSION_STORE_PATH") or "").strip()
    if configured:
        return Path(configured)
    return Path("data") / "temp" / "app_sessions.json"


def _load_from_disk() -> None:
    path = _store_path()
    if not path.exists():
        return
    try:
        raw = path.read_text(encoding="utf-8")
        payload = json.loads(raw or "{}")
        sessions = payload.get("sessions") if isinstance(payload, dict) else None
        if isinstance(sessions, dict):
            for key, value in sessions.items():
                if isinstance(key, str) and isinstance(value, dict):
                    _SESSIONS[key] = value
    except Exception:
        # Corrupt session cache should not block app boot.
        return


def _save_to_disk() -> None:
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {"sessions": _SESSIONS}
    path.write_text(json.dumps(data, ensure_ascii=True), encoding="utf-8")


_load_from_disk()


def create_session(user: Dict) -> str:
    token = secrets.token_urlsafe(48)
    with _LOCK:
        _SESSIONS[token] = dict(user or {})
        _save_to_disk()
    return token


def get_session_user(token: str) -> Optional[Dict]:
    key = (token or "").strip()
    if not key:
        return None
    with _LOCK:
        user = _SESSIONS.get(key)
    return dict(user) if user else None


def revoke_session(token: str) -> None:
    key = (token or "").strip()
    if not key:
        return
    with _LOCK:
        _SESSIONS.pop(key, None)
        _save_to_disk()