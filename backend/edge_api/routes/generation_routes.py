import os
import random
from datetime import datetime
from typing import Dict, Optional

from flask import Blueprint, g, jsonify, request

from backend.edge_api.utils.api_response import error_response
from backend.adapters.llm_groq import choose_stt_model, transcribe_audio_bytes
from backend.adapters.provider_hf import image_to_image_base64, text_to_image_base64
from backend.schemas.requests import ValidationError, parse_generate_payload, parse_refine_payload
from backend.services.database.cases_repo import get_case
from backend.services.database.client import DatabaseConfigError, DatabaseError
from backend.services.database.refinements_repo import create_refinement, list_refinements
from backend.services.database.sketches_repo import create_sketch, get_latest_version, list_case_sketches
from backend.services.storage.supabase_storage import (
    StorageConfigError,
    StorageError,
    create_signed_url,
    download_image_bytes,
    upload_png_base64,
)

generation_bp = Blueprint("generation", __name__)


def _is_true(value: str) -> bool:
    return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def _current_user_id() -> str:
    user = getattr(g, "auth_user", {}) or {}
    return (user.get("id") or "").strip()


def _next_case_version(case_id: str) -> int:
    return get_latest_version(case_id) + 1


def _storage_path_for_version(case_id: str, version: int, artifact_type: str) -> str:
    if artifact_type == "refinement":
        return f"cases/{case_id}/refinements/refine_{version}.png"
    return f"cases/{case_id}/sketches/sketch_{version}.png"


def _inline_png_url(image_b64: str) -> str:
    return f"data:image/png;base64,{image_b64}"


def _fallback_artifact(storage_path: str, image_b64: str) -> Dict[str, str]:
    return {
        "storage_path": storage_path,
        "signed_image_url": _inline_png_url(image_b64),
    }


def _upload_case_artifact(case_id: str, sketch_b64: str, version: int, artifact_type: str) -> Dict[str, str]:
    path = _storage_path_for_version(case_id=case_id, version=version, artifact_type=artifact_type)
    try:
        return upload_png_base64(storage_path=path, image_b64=sketch_b64)
    except (StorageConfigError, StorageError):
        return _fallback_artifact(path, sketch_b64)


def _upload_ad_hoc_artifact(sketch_b64: str) -> Dict[str, str]:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    path = f"adhoc/sketches/sketch_{ts}.png"
    try:
        return upload_png_base64(storage_path=path, image_b64=sketch_b64)
    except (StorageConfigError, StorageError):
        return _fallback_artifact(path, sketch_b64)


def _resolve_image_generation(description: str, model: Optional[str], provider: Optional[str]) -> Dict:
    pencil_only = _is_true(os.environ.get("PENCIL_ONLY", "true"))
    pencil_prompt = (
        f"{description}, black and white pencil sketch, hand-drawn forensic portrait, "
        "graphite shading, clean linework, neutral background, no color"
    )
    final_prompt = pencil_prompt if pencil_only else description

    sketch_b64 = text_to_image_base64(
        prompt=final_prompt,
        model=model,
        provider=provider,
    )

    return {
        "sketch_b64": sketch_b64,
        "final_prompt": final_prompt,
        "pencil_only": pencil_only,
    }


def _build_generate_response(
    data: Dict,
    generation: Dict,
    storage_path: str,
    signed_image_url: str,
    sketch_record: Optional[Dict],
) -> Dict:
    return {
        "success": True,
        "portrait": generation["sketch_b64"],
        "sketch": generation["sketch_b64"],
        "prompt": generation["final_prompt"],
        "negative": "",
        "seed": int(data.get("seed") or random.randint(1, 999999)),
        "mode": "pencil" if generation["pencil_only"] else "free",
        "pencil_only": generation["pencil_only"],
        "saved_image_path": storage_path,
        "storage_path": storage_path,
        "signed_image_url": signed_image_url,
        "provider": (data.get("provider") or os.environ.get("HF_PROVIDER") or "").strip() or os.environ.get("HF_PROVIDER", "hf-inference"),
        "model": (data.get("model") or os.environ.get("HF_MODEL") or "").strip() or os.environ.get("HF_MODEL", "stabilityai/stable-diffusion-xl-base-1.0"),
        "sketch_record": sketch_record,
    }


@generation_bp.post("/generate-image-api")
def generate_image_api():
    data = request.get_json(silent=True) or {}
    try:
        payload = parse_generate_payload(data, require_case_id=False)
    except ValidationError as exc:
        return error_response(str(exc), 400, code="VALIDATION_ERROR", details=exc.details)

    description = payload["description"] or ""
    model = payload["model"] or (os.environ.get("HF_MODEL") or "").strip() or None
    provider = payload["provider"] or (os.environ.get("HF_PROVIDER") or "").strip() or None

    try:
        generation = _resolve_image_generation(description=description, model=model, provider=provider)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    uploaded = None

    sketch_record = None
    case_id = payload["case_id"] or ""
    try:
        if case_id:
            version = _next_case_version(case_id)
            uploaded = _upload_case_artifact(case_id=case_id, sketch_b64=generation["sketch_b64"], version=version, artifact_type="sketch")
            sketch_record = create_sketch(case_id=case_id, image_url=uploaded["storage_path"], version=version)
        else:
            uploaded = _upload_ad_hoc_artifact(sketch_b64=generation["sketch_b64"])
    except (DatabaseConfigError, DatabaseError, StorageConfigError, StorageError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify(
        _build_generate_response(
            data=data,
            generation=generation,
            storage_path=uploaded["storage_path"],
            signed_image_url=uploaded["signed_image_url"],
            sketch_record=sketch_record,
        )
    )


@generation_bp.post("/sketch/generate")
def sketch_generate_route():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized user context."}), 401

    data = request.get_json(silent=True) or {}
    try:
        payload = parse_generate_payload(data, require_case_id=True)
    except ValidationError as exc:
        return error_response(str(exc), 400, code="VALIDATION_ERROR", details=exc.details)

    case_id = payload["case_id"] or ""
    description = payload["description"] or ""
    model = payload["model"] or (os.environ.get("HF_MODEL") or "").strip() or None
    provider = payload["provider"] or (os.environ.get("HF_PROVIDER") or "").strip() or None

    try:
        case_row = get_case(case_id=case_id, user_id=user_id)
    except (DatabaseConfigError, DatabaseError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    if not case_row:
        return jsonify({"success": False, "error": "Case not found."}), 404

    try:
        generation = _resolve_image_generation(description=description, model=model, provider=provider)
        version = _next_case_version(case_id)
        uploaded = _upload_case_artifact(case_id=case_id, sketch_b64=generation["sketch_b64"], version=version, artifact_type="sketch")
        sketch_record = create_sketch(case_id=case_id, image_url=uploaded["storage_path"], version=version)
    except (DatabaseConfigError, DatabaseError, StorageConfigError, StorageError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    response = _build_generate_response(
        data=data,
        generation=generation,
        storage_path=uploaded["storage_path"],
        signed_image_url=uploaded["signed_image_url"],
        sketch_record=sketch_record,
    )
    response["case"] = case_row
    return jsonify(response)


@generation_bp.post("/refine/add")
def refine_add_route():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized user context."}), 401

    data = request.get_json(silent=True) or {}
    try:
        payload = parse_refine_payload(data)
    except ValidationError as exc:
        return error_response(str(exc), 400, code="VALIDATION_ERROR", details=exc.details)

    case_id = payload["case_id"]
    base_description = payload["description"]
    refinement_text = payload["refinement"]
    attribute_type = payload["attribute_type"]
    model = (data.get("model") or os.environ.get("HF_MODEL") or "").strip() or None
    provider = (data.get("provider") or os.environ.get("HF_PROVIDER") or "").strip() or None

    try:
        case_row = get_case(case_id=case_id, user_id=user_id)
    except (DatabaseConfigError, DatabaseError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    if not case_row:
        return jsonify({"success": False, "error": "Case not found."}), 404

    refined_prompt = (
        f"{base_description}. Keep the same identity and all existing facial features. "
        f"Apply only this minor refinement: {refinement_text}. "
        "Do not redesign the face."
    )

    x_coord = payload["x_coord"]
    y_coord = payload["y_coord"]

    try:
        generation = None
        latest_sketches = list_case_sketches(case_id=case_id)
        if latest_sketches:
            latest_path = (latest_sketches[0].get("image_url") or "").strip()
            if latest_path:
                try:
                    source_image_bytes = download_image_bytes(latest_path)
                    refined_b64 = image_to_image_base64(
                        image_bytes=source_image_bytes,
                        prompt=refined_prompt,
                        model=model,
                        provider=provider,
                    )
                    generation = {
                        "sketch_b64": refined_b64,
                        "final_prompt": refined_prompt,
                        "pencil_only": _is_true(os.environ.get("PENCIL_ONLY", "true")),
                    }
                except Exception:
                    generation = None

        if generation is None:
            generation = _resolve_image_generation(description=refined_prompt, model=model, provider=provider)

        version = _next_case_version(case_id)
        uploaded = _upload_case_artifact(case_id=case_id, sketch_b64=generation["sketch_b64"], version=version, artifact_type="refinement")
        sketch_record = create_sketch(case_id=case_id, image_url=uploaded["storage_path"], version=version)
        refinement_record = create_refinement(
            case_id=case_id,
            attribute_type=attribute_type,
            description=refinement_text,
            x_coord=x_coord,
            y_coord=y_coord,
        )
    except (DatabaseConfigError, DatabaseError, StorageConfigError, StorageError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    response = _build_generate_response(
        data=data,
        generation=generation,
        storage_path=uploaded["storage_path"],
        signed_image_url=uploaded["signed_image_url"],
        sketch_record=sketch_record,
    )
    response["case"] = case_row
    response["refinement_record"] = refinement_record
    return jsonify(response)


@generation_bp.get("/cases/<case_id>/timeline")
def case_timeline_route(case_id: str):
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "Unauthorized user context."}), 401

    try:
        case_row = get_case(case_id=case_id, user_id=user_id)
    except (DatabaseConfigError, DatabaseError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    if not case_row:
        return jsonify({"success": False, "error": "Case not found."}), 404

    try:
        sketches = list_case_sketches(case_id=case_id)
        refinements = list_refinements(case_id=case_id)
        for sketch in sketches:
            image_url = (sketch.get("image_url") or "").strip()
            if image_url:
                try:
                    sketch["signed_image_url"] = create_signed_url(image_url)
                except (StorageConfigError, StorageError):
                    sketch["signed_image_url"] = ""
    except (DatabaseConfigError, DatabaseError, StorageConfigError, StorageError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    events = []
    for sketch in sketches:
        events.append(
            {
                "event_type": "sketch",
                "created_at": sketch.get("created_at"),
                "payload": sketch,
            }
        )

    for refinement in refinements:
        events.append(
            {
                "event_type": "refinement",
                "created_at": refinement.get("created_at"),
                "payload": refinement,
            }
        )

    events.sort(key=lambda item: (item.get("created_at") or ""))

    return jsonify(
        {
            "success": True,
            "case": case_row,
            "sketches": sketches,
            "refinements": refinements,
            "timeline": events,
        }
    )


@generation_bp.get("/speech-model")
def speech_model():
    try:
        model = choose_stt_model()
        return jsonify({"success": True, "model": model})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@generation_bp.post("/transcribe-audio-api")
def transcribe_audio_api():
    audio = request.files.get("audio")
    if audio is None:
        return jsonify({"success": False, "error": "audio file is required"}), 400

    audio_bytes = audio.read()
    if not audio_bytes:
        return jsonify({"success": False, "error": "audio file is empty"}), 400

    language = (request.form.get("language") or "").strip() or None
    model = (request.form.get("model") or "").strip() or None

    try:
        out = transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            filename=audio.filename or "recording.wav",
            model=model,
            language=language,
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify(
        {
            "success": True,
            "text": out.get("text", ""),
            "model": out.get("model", ""),
        }
    )
