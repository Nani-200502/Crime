import os
from typing import List, Optional

import requests


GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")


def _get_groq_key() -> str:
	key = (
		os.environ.get("GROQ_API_KEY")
		or os.environ.get("GROQ_API")
		or ""
	).strip()
	if not key:
		raise RuntimeError("GROQ_API_KEY (or GROQ_API) is missing in environment.")
	return key


def list_available_models(timeout: int = 30) -> List[str]:
	key = _get_groq_key()
	url = f"{GROQ_BASE_URL}/models"
	headers = {
		"Authorization": f"Bearer {key}",
		"Content-Type": "application/json",
	}
	resp = requests.get(url, headers=headers, timeout=timeout)
	resp.raise_for_status()
	data = resp.json() or {}
	return [m.get("id", "") for m in data.get("data", []) if m.get("id")]


def choose_stt_model(preferred: Optional[str] = None) -> str:
	models = list_available_models()

	# User override first.
	if preferred and preferred in models:
		return preferred

	env_preferred = os.environ.get("GROQ_STT_MODEL", "").strip()
	if env_preferred and env_preferred in models:
		return env_preferred

	candidates = [
		"whisper-large-v3-turbo",
		"whisper-large-v3",
		"distil-whisper-large-v3-en",
	]
	for c in candidates:
		if c in models:
			return c

	raise RuntimeError("No supported Groq speech-to-text model found in account model list.")


def transcribe_audio_bytes(
	audio_bytes: bytes,
	filename: str = "recording.wav",
	model: Optional[str] = None,
	language: Optional[str] = None,
	timeout: int = 120,
) -> dict:
	if not audio_bytes:
		raise ValueError("audio_bytes is empty")

	key = _get_groq_key()
	stt_model = choose_stt_model(preferred=model)
	url = f"{GROQ_BASE_URL}/audio/transcriptions"
	headers = {
		"Authorization": f"Bearer {key}",
	}
	data = {
		"model": stt_model,
		"response_format": "verbose_json",
	}
	if language:
		data["language"] = language

	files = {
		"file": (filename, audio_bytes, "audio/wav"),
	}

	resp = requests.post(url, headers=headers, data=data, files=files, timeout=timeout)
	resp.raise_for_status()
	out = resp.json() or {}
	return {
		"text": (out.get("text") or "").strip(),
		"model": stt_model,
		"raw": out,
	}

