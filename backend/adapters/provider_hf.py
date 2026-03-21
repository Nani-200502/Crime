import base64
import io
import os
from typing import Optional

from huggingface_hub import InferenceClient
from PIL import Image


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


def image_to_image_base64(
	image_bytes: bytes,
	prompt: str,
	model: Optional[str] = None,
	provider: Optional[str] = None,
	strength: Optional[float] = None,
	guidance_scale: Optional[float] = None,
	num_inference_steps: Optional[int] = None,
	negative_prompt: Optional[str] = None,
) -> str:
	if not image_bytes:
		raise ValueError("image_bytes is required")
	if not (prompt or "").strip():
		raise ValueError("prompt is required")

	client = _get_client(provider=provider)
	image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
	kwargs = {
		"image": image,
		"prompt": prompt.strip(),
		"model": (model or DEFAULT_MODEL),
	}
	if strength is not None:
		kwargs["strength"] = float(strength)
	if guidance_scale is not None:
		kwargs["guidance_scale"] = float(guidance_scale)
	if num_inference_steps is not None:
		kwargs["num_inference_steps"] = int(num_inference_steps)
	if (negative_prompt or "").strip():
		kwargs["negative_prompt"] = negative_prompt.strip()

	# Prefer a low-strength transformation to keep identity and only apply small edits.
	try:
		out = client.image_to_image(**kwargs)
	except (TypeError, ValueError):
		# Some providers reject PIL image input and/or optional parameters; retry with minimal byte-based input.
		out = client.image_to_image(image=image_bytes, prompt=prompt.strip(), model=(model or DEFAULT_MODEL))

	buf = io.BytesIO()
	out.save(buf, format="PNG")
	return base64.b64encode(buf.getvalue()).decode("ascii")

