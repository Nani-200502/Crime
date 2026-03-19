import base64
import io
import os
from typing import Optional

from huggingface_hub import InferenceClient


DEFAULT_PROVIDER = os.environ.get("HF_PROVIDER", "hf-inference")
DEFAULT_MODEL = os.environ.get("HF_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")


def _get_client(provider: Optional[str] = None) -> InferenceClient:
	token = os.environ.get("HF_TOKEN", "").strip()
	if not token:
		raise RuntimeError("HF_TOKEN is missing. Set it in your environment.")

	return InferenceClient(
		provider=(provider or DEFAULT_PROVIDER),
		api_key=token,
	)


def text_to_image_pil(
	prompt: str,
	model: Optional[str] = None,
	provider: Optional[str] = None,
) -> "object":
	if not (prompt or "").strip():
		raise ValueError("prompt is required")

	client = _get_client(provider=provider)
	return client.text_to_image(
		prompt.strip(),
		model=(model or DEFAULT_MODEL),
	)


def text_to_image_base64(
	prompt: str,
	model: Optional[str] = None,
	provider: Optional[str] = None,
) -> str:
	image = text_to_image_pil(prompt=prompt, model=model, provider=provider)
	buf = io.BytesIO()
	image.save(buf, format="PNG")
	return base64.b64encode(buf.getvalue()).decode("ascii")

