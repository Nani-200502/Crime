import base64
from datetime import datetime
from pathlib import Path


def save_generated_image(image_b64: str) -> str:
    images_dir = Path("data") / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"sketch_{ts}.png"
    file_path = images_dir / filename
    raw = base64.b64decode(image_b64)
    file_path.write_bytes(raw)
    return str(file_path).replace("\\", "/")
