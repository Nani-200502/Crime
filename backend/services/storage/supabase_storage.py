import base64
import os
from typing import Dict

import requests


class StorageConfigError(RuntimeError):
    pass


class StorageError(RuntimeError):
    pass


def _required_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise StorageConfigError(f"{name} is missing in environment.")
    return value


def _supabase_url() -> str:
    return _required_env("SUPABASE_URL").rstrip("/")


def _service_role_key() -> str:
    return _required_env("SUPABASE_SERVICE_ROLE_KEY")


def _bucket_name() -> str:
    return _required_env("SUPABASE_STORAGE_BUCKET")


def _signed_url_ttl_seconds() -> int:
    raw = (os.environ.get("SUPABASE_SIGNED_URL_TTL_SECONDS") or "3600").strip()
    try:
        value = int(raw)
    except ValueError as exc:
        raise StorageConfigError("SUPABASE_SIGNED_URL_TTL_SECONDS must be an integer.") from exc
    return max(60, value)


def _headers(content_type: str = "application/json") -> Dict[str, str]:
    service_key = _service_role_key()
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": content_type,
    }


def _normalize_storage_path(storage_path: str) -> str:
    path = (storage_path or "").strip().lstrip("/")
    if not path:
        raise StorageError("Storage path is required.")

    bucket = _bucket_name()
    prefix = f"{bucket}/"
    if path.startswith(prefix):
        return path[len(prefix) :]
    return path


def _raise_for_bad_status(response: requests.Response, operation: str) -> None:
    if response.status_code < 400:
        return

    message = response.text
    try:
        payload = response.json()
        message = payload.get("error") or payload.get("message") or payload.get("msg") or str(payload)
    except ValueError:
        pass
    raise StorageError(f"{operation} failed (HTTP {response.status_code}): {message}")


def create_signed_url(storage_path: str, expires_in: int = 0) -> str:
    normalized_path = _normalize_storage_path(storage_path)
    ttl = expires_in or _signed_url_ttl_seconds()

    url = f"{_supabase_url()}/storage/v1/object/sign/{_bucket_name()}/{normalized_path}"
    try:
        response = requests.post(
            url,
            headers=_headers(),
            json={"expiresIn": int(ttl)},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise StorageError(f"Storage sign request failed: {exc}") from exc

    _raise_for_bad_status(response, "Sign URL")

    try:
        data = response.json()
    except ValueError as exc:
        raise StorageError("Storage sign response is not valid JSON.") from exc

    signed_path = (data.get("signedURL") or data.get("signedUrl") or "").strip()
    if not signed_path:
        raise StorageError("Storage sign response did not include signedURL.")

    if signed_path.startswith("http://") or signed_path.startswith("https://"):
        return signed_path

    if signed_path.startswith("/storage/v1"):
        return f"{_supabase_url()}{signed_path}"

    return f"{_supabase_url()}/storage/v1{signed_path}"


def upload_png_bytes(storage_path: str, png_bytes: bytes, *, upsert: bool = True, signed_url_ttl: int = 0) -> Dict[str, str]:
    normalized_path = _normalize_storage_path(storage_path)
    url = f"{_supabase_url()}/storage/v1/object/{_bucket_name()}/{normalized_path}"

    headers = _headers(content_type="image/png")
    headers["x-upsert"] = "true" if upsert else "false"

    try:
        response = requests.post(url, headers=headers, data=png_bytes, timeout=60)
    except requests.RequestException as exc:
        raise StorageError(f"Storage upload failed: {exc}") from exc

    _raise_for_bad_status(response, "Upload")

    signed_url = create_signed_url(normalized_path, expires_in=signed_url_ttl)
    return {
        "storage_path": normalized_path,
        "signed_image_url": signed_url,
    }


def upload_png_base64(storage_path: str, image_b64: str, *, upsert: bool = True, signed_url_ttl: int = 0) -> Dict[str, str]:
    try:
        png_bytes = base64.b64decode(image_b64)
    except Exception as exc:
        raise StorageError(f"Invalid base64 image data: {exc}") from exc

    return upload_png_bytes(storage_path=storage_path, png_bytes=png_bytes, upsert=upsert, signed_url_ttl=signed_url_ttl)


def download_image_bytes(storage_path: str) -> bytes:
    normalized_path = _normalize_storage_path(storage_path)
    url = f"{_supabase_url()}/storage/v1/object/{_bucket_name()}/{normalized_path}"

    try:
        response = requests.get(url, headers=_headers(content_type="application/octet-stream"), timeout=60)
    except requests.RequestException as exc:
        raise StorageError(f"Storage download failed: {exc}") from exc

    _raise_for_bad_status(response, "Download")
    return response.content