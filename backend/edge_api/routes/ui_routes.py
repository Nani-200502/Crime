from pathlib import Path

from flask import Blueprint, abort, send_from_directory

ui_bp = Blueprint("ui", __name__)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FORENSIC_DIST = PROJECT_ROOT / "forensic-canvas" / "dist"


def _serve_spa_index():
    if not FORENSIC_DIST.exists():
        abort(500, description="forensic-canvas dist is missing. Run frontend build first.")
    return send_from_directory(str(FORENSIC_DIST), "index.html")


@ui_bp.get("/")
def home_page():
    return _serve_spa_index()


@ui_bp.get("/assets/<path:filename>")
def serve_assets(filename: str):
    assets_dir = FORENSIC_DIST / "assets"
    return send_from_directory(str(assets_dir), filename)


@ui_bp.get("/<path:path>")
def spa_fallback(path: str):
    candidate = FORENSIC_DIST / path
    if candidate.exists() and candidate.is_file():
        return send_from_directory(str(FORENSIC_DIST), path)
    return _serve_spa_index()
