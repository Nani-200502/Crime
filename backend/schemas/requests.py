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


def _bounded_float(
    value: Any,
    *,
    field: str,
    min_value: float,
    max_value: float,
    required: bool = False,
) -> Optional[float]:
    parsed = _optional_float(value, field=field)
    if parsed is None:
        if required:
            raise ValidationError(f"{field} is required.", details={"field": field})
        return None
    if parsed < min_value or parsed > max_value:
        raise ValidationError(
            f"{field} must be between {min_value} and {max_value}.",
            details={"field": field, "min": min_value, "max": max_value},
        )
    return parsed


def _optional_int(value: Any, *, field: str) -> Optional[int]:
    if value is None:
        return None
    text = _str(value)
    if not text:
        return None
    try:
        return int(text)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{field} must be an integer when provided.", details={"field": field}) from exc


def _bounded_int(
    value: Any,
    *,
    field: str,
    min_value: int,
    max_value: int,
    required: bool = False,
) -> Optional[int]:
    parsed = _optional_int(value, field=field)
    if parsed is None:
        if required:
            raise ValidationError(f"{field} is required.", details={"field": field})
        return None
    if parsed < min_value or parsed > max_value:
        raise ValidationError(
            f"{field} must be between {min_value} and {max_value}.",
            details={"field": field, "min": min_value, "max": max_value},
        )
    return parsed


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
    refinement_mode = _bounded_text(body.get("refinement_mode"), field="refinement_mode", max_len=40).lower() or "img2img"
    if refinement_mode not in ("img2img", "text2img"):
        raise ValidationError(
            "refinement_mode must be either img2img or text2img.",
            details={"field": "refinement_mode", "allowed": ["img2img", "text2img"]},
        )

    strength = _bounded_float(body.get("strength"), field="strength", min_value=0.0, max_value=1.0)
    guidance_scale = _bounded_float(body.get("guidance_scale"), field="guidance_scale", min_value=0.0, max_value=20.0)
    num_inference_steps = _bounded_int(body.get("num_inference_steps"), field="num_inference_steps", min_value=1, max_value=150)
    x_coord = _optional_float(body.get("x_coord"), field="x_coord")
    y_coord = _optional_float(body.get("y_coord"), field="y_coord")

    return {
        "case_id": case_id,
        "description": description,
        "refinement": refinement,
        "attribute_type": attribute_type,
        "refinement_mode": refinement_mode,
        "strength": strength,
        "guidance_scale": guidance_scale,
        "num_inference_steps": num_inference_steps,
        "x_coord": x_coord,
        "y_coord": y_coord,
    }