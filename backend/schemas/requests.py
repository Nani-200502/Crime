from typing import Any, Dict, Optional


class ValidationError(ValueError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.details = details or {}


def _expect_dict(data: Any) -> Dict[str, Any]:
    if isinstance(data, dict):
        return data
    raise ValidationError("JSON request body must be an object.")


def _str(value: Any) -> str:
    return str(value or "").strip()


def _bounded_text(value: Any, *, field: str, max_len: int, required: bool = False) -> str:
    text = _str(value)
    if required and not text:
        raise ValidationError(f"{field} is required.", details={"field": field})
    if len(text) > max_len:
        raise ValidationError(
            f"{field} exceeds maximum length of {max_len} characters.",
            details={"field": field, "max_length": max_len},
        )
    return text


def _optional_float(value: Any, *, field: str) -> Optional[float]:
    if value is None:
        return None
    text = _str(value)
    if not text:
        return None
    try:
        return float(text)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{field} must be numeric when provided.", details={"field": field}) from exc


def parse_auth_payload(data: Any) -> Dict[str, str]:
    body = _expect_dict(data)
    email = _bounded_text(body.get("email"), field="email", max_len=320, required=True)
    password = _bounded_text(body.get("password"), field="password", max_len=256, required=True)
    return {"email": email, "password": password}


def parse_password_reset_payload(data: Any) -> Dict[str, str]:
    body = _expect_dict(data)
    email = _bounded_text(body.get("email"), field="email", max_len=320, required=True)
    return {"email": email}


def parse_create_case_payload(data: Any) -> Dict[str, Optional[str]]:
    body = _expect_dict(data)
    title = _bounded_text(body.get("title"), field="title", max_len=160)
    description = _bounded_text(body.get("description"), field="description", max_len=6000)
    case_id = _bounded_text(body.get("case_id"), field="case_id", max_len=100)
    return {
        "title": title,
        "description": description,
        "case_id": case_id or None,
    }


def parse_generate_payload(data: Any, *, require_case_id: bool) -> Dict[str, Optional[str]]:
    body = _expect_dict(data)
    case_id = _bounded_text(body.get("case_id"), field="case_id", max_len=100)
    description = _bounded_text(body.get("description"), field="description", max_len=8000, required=True)
    model = _bounded_text(body.get("model"), field="model", max_len=256)
    provider = _bounded_text(body.get("provider"), field="provider", max_len=256)

    if require_case_id and not case_id:
        raise ValidationError("case_id is required.", details={"field": "case_id"})

    return {
        "case_id": case_id or None,
        "description": description,
        "model": model or None,
        "provider": provider or None,
    }


def parse_refine_payload(data: Any) -> Dict[str, Any]:
    body = _expect_dict(data)
    case_id = _bounded_text(body.get("case_id"), field="case_id", max_len=100, required=True)
    description = _bounded_text(body.get("description"), field="description", max_len=8000, required=True)
    refinement = _bounded_text(body.get("refinement"), field="refinement", max_len=4000, required=True)
    attribute_type = _bounded_text(body.get("attribute_type"), field="attribute_type", max_len=80) or "general"
    x_coord = _optional_float(body.get("x_coord"), field="x_coord")
    y_coord = _optional_float(body.get("y_coord"), field="y_coord")

    return {
        "case_id": case_id,
        "description": description,
        "refinement": refinement,
        "attribute_type": attribute_type,
        "x_coord": x_coord,
        "y_coord": y_coord,
    }