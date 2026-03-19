import os
import random
import base64
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request

from backend.adapters.provider_hf import text_to_image_base64
from backend.adapters.llm_groq import choose_stt_model, transcribe_audio_bytes


load_dotenv()

app = Flask(__name__)


def _is_true(value: str) -> bool:
	return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def _save_generated_image(image_b64: str) -> str:
	images_dir = Path("data") / "images"
	images_dir.mkdir(parents=True, exist_ok=True)
	ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
	filename = f"sketch_{ts}.png"
	file_path = images_dir / filename
	raw = base64.b64decode(image_b64)
	file_path.write_bytes(raw)
	return str(file_path).replace("\\", "/")


@app.get("/health")
def health():
	return jsonify({"ok": True})


@app.post("/generate-image-api")
def generate_image_api():
	data = request.get_json(silent=True) or {}
	description = (data.get("description") or "").strip()
	if not description:
		return jsonify({"success": False, "error": "description is required"}), 400

	pencil_only = _is_true(os.environ.get("PENCIL_ONLY", "true"))
	pencil_prompt = (
		f"{description}, black and white pencil sketch, hand-drawn forensic portrait, "
		"graphite shading, clean linework, neutral background, no color"
	)
	final_prompt = pencil_prompt if pencil_only else description

	model = (data.get("model") or os.environ.get("HF_MODEL") or "").strip() or None
	provider = (data.get("provider") or os.environ.get("HF_PROVIDER") or "").strip() or None

	try:
		sketch_b64 = text_to_image_base64(
			prompt=final_prompt,
			model=model,
			provider=provider,
		)
	except Exception as exc:
		return jsonify({"success": False, "error": str(exc)}), 500

	try:
		saved_image_path = _save_generated_image(sketch_b64)
	except Exception as exc:
		return jsonify({"success": False, "error": f"Image generated but failed to save: {exc}"}), 500

	return jsonify(
		{
			"success": True,
			"portrait": sketch_b64,
			"sketch": sketch_b64,
			"prompt": final_prompt,
			"negative": "",
			"seed": int(data.get("seed") or random.randint(1, 999999)),
			"mode": "pencil" if pencil_only else "free",
			"pencil_only": pencil_only,
			"saved_image_path": saved_image_path,
			"provider": provider or os.environ.get("HF_PROVIDER", "hf-inference"),
			"model": model or os.environ.get("HF_MODEL", "stabilityai/stable-diffusion-xl-base-1.0"),
		}
	)


@app.get("/speech-model")
def speech_model():
	try:
		model = choose_stt_model()
		return jsonify({"success": True, "model": model})
	except Exception as exc:
		return jsonify({"success": False, "error": str(exc)}), 500


@app.post("/transcribe-audio-api")
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


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5000, debug=False)
