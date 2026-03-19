import base64
import os
from io import BytesIO

import requests
import streamlit as st
from PIL import Image

st.set_page_config(page_title="Criminal Sketch Generator", layout="wide")

st.markdown(
    """
    <style>
    .stApp {
        background: radial-gradient(circle at 10% -20%, #f4e6d4 0%, #efe5d8 35%, #f8f5ef 75%);
    }
    .hero {
        border: 1px solid #dfd4c6;
        border-radius: 16px;
        padding: 18px 20px;
        background: linear-gradient(120deg, #fffaf1 0%, #f7efe2 100%);
        box-shadow: 0 10px 24px rgba(77, 60, 34, 0.07);
        margin-bottom: 14px;
    }
    .hero h1 {
        margin: 0;
        font-size: 1.9rem;
        color: #2f2518;
        letter-spacing: 0.2px;
    }
    .hero p {
        margin: 6px 0 0;
        color: #5e5347;
        font-size: 0.98rem;
    }
    .block-card {
        border: 1px solid #e1d7c9;
        border-radius: 14px;
        padding: 10px 12px 4px;
        background: rgba(255, 252, 246, 0.95);
    }
    .section-title {
        margin: 2px 0 10px;
        color: #2c241b;
        font-weight: 700;
        font-size: 1.05rem;
    }
    .result-shell {
        border: 1px dashed #ccbda9;
        border-radius: 14px;
        padding: 14px;
        background: #fffaf2;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

DEFAULT_BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")


FIELD_LABELS = [
    ("face_shape", "Face Shape"),
    ("skin_tone", "Skin Tone"),
    ("gender", "Gender"),
    ("age", "Approx Age"),
    ("hair_style", "Hair Style"),
    ("hair_length", "Hair Length"),
    ("eyebrows", "Eyebrow Type"),
    ("eyes", "Eyes"),
    ("nose", "Nose Type"),
    ("lips", "Lips"),
    ("facial_hair", "Facial Hair"),
    ("marks", "Unique Marks"),
]


def build_description(values: dict) -> str:
    parts = []
    prompt_text = (values.get("prompt_text") or "").strip()
    if prompt_text:
        parts.append(prompt_text)
    for key, label in FIELD_LABELS:
        val = (values.get(key) or "").strip()
        if val:
            parts.append(f"{label}: {val}")
    notes = (values.get("notes") or "").strip()
    if notes:
        parts.append(f"Additional Notes: {notes}")
    return ", ".join(parts)


def decode_base64_image(image_b64: str) -> Image.Image:
    raw = base64.b64decode(image_b64)
    return Image.open(BytesIO(raw)).convert("RGB")


def reset_form_state() -> None:
    for key, _ in FIELD_LABELS:
        st.session_state[key] = ""
    st.session_state["prompt_text"] = ""
    st.session_state["notes"] = ""
    st.session_state["steps"] = 20
    st.session_state["guidance"] = 7.5


st.markdown(
    """
    <div class="hero">
      <h1>Criminal Sketch Generator</h1>
      <p>Voice-enabled witness intake with AI sketch generation. Fill fields or transcribe voice, then generate.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

with st.sidebar:
    st.subheader("System")
    backend_url = st.text_input("Backend URL", value=DEFAULT_BACKEND_URL)
    st.caption("Expected endpoints: /generate-image-api and /transcribe-audio-api")
    st.divider()
    st.markdown("**Session Controls**")
    if st.button("Reset All Fields", width="stretch"):
        reset_form_state()
        st.rerun()

backend_base_url = backend_url.strip().rstrip("/")

with st.container(border=True):
    st.markdown('<div class="section-title">Voice Input (Groq Speech-to-Text)</div>', unsafe_allow_html=True)
    audio_value = st.audio_input("Record witness speech", key="audio_prompt")
    voice_col1, voice_col2 = st.columns([1, 2])
    transcribe_clicked = voice_col1.button("Transcribe Voice", width="stretch")
    voice_status = voice_col2.empty()

    if transcribe_clicked:
        if audio_value is None:
            voice_status.warning("Please record audio first.")
        else:
            try:
                files = {
                    "audio": ("recording.wav", audio_value.read(), "audio/wav"),
                }
                with st.spinner("Transcribing with Groq..."):
                    response = requests.post(
                        f"{backend_base_url}/transcribe-audio-api",
                        files=files,
                        timeout=180,
                    )
                data = response.json()
            except requests.RequestException as exc:
                voice_status.error(f"Cannot reach backend: {exc}")
            except ValueError:
                voice_status.error("Backend returned invalid JSON for transcription.")
            else:
                if response.status_code >= 400 or not data.get("success", False):
                    voice_status.error(f"Transcription failed: {data.get('error', f'HTTP {response.status_code}')}")
                else:
                    transcript = (data.get("text") or "").strip()
                    used_model = data.get("model", "unknown")
                    if transcript:
                        st.session_state["prompt_text"] = transcript
                        voice_status.success(f"Transcribed using {used_model} and filled Prompt Text Box.")
                    else:
                        voice_status.warning("Transcription returned empty text.")

left, right = st.columns([1.2, 1], gap="large")

with left:
    st.markdown('<div class="block-card">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">Witness Description Builder</div>', unsafe_allow_html=True)

    prompt_text = st.text_area(
        "Prompt Text Box",
        key="prompt_text",
        height=90,
        help="Voice transcription is auto-filled here. You can edit it manually.",
        placeholder="Describe the suspect in plain language...",
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        face_shape = st.text_input("Face Shape", key="face_shape")
        age = st.text_input("Approx Age", key="age")
        eyes = st.text_input("Eyes", key="eyes")
        facial_hair = st.text_input("Facial Hair", key="facial_hair")
    with col2:
        skin_tone = st.text_input("Skin Tone", key="skin_tone")
        hair_style = st.text_input("Hair Style", key="hair_style")
        nose = st.text_input("Nose Type", key="nose")
        marks = st.text_input("Unique Marks", key="marks")
    with col3:
        gender = st.text_input("Gender", key="gender")
        hair_length = st.text_input("Hair Length", key="hair_length")
        lips = st.text_input("Lips", key="lips")
        eyebrows = st.text_input("Eyebrow Type", key="eyebrows")

    notes = st.text_area("Additional Notes", key="notes", height=100)

    c1, c2 = st.columns(2)
    with c1:
        steps = st.number_input("Steps", min_value=10, max_value=40, value=20, step=1, key="steps")
    with c2:
        guidance = st.number_input("Guidance", min_value=1.0, max_value=20.0, value=7.5, step=0.5, key="guidance")

    st.caption("Mode is fixed to pencil sketch.")

    b1, b2 = st.columns(2)
    generate_clicked = b1.button("Generate Sketch", type="primary", width="stretch")
    clear_clicked = b2.button("Clear", width="stretch")

    if clear_clicked:
        reset_form_state()
        st.rerun()

    values = {
        "prompt_text": prompt_text,
        "face_shape": face_shape,
        "skin_tone": skin_tone,
        "gender": gender,
        "age": age,
        "hair_style": hair_style,
        "hair_length": hair_length,
        "eyebrows": eyebrows,
        "eyes": eyes,
        "nose": nose,
        "lips": lips,
        "facial_hair": facial_hair,
        "marks": marks,
        "notes": notes,
    }
    description = build_description(values)

    st.markdown("**Composed Description**")
    st.code(description or "(empty)")
    st.markdown("</div>", unsafe_allow_html=True)

with right:
    st.markdown('<div class="section-title">Generated Sketch</div>', unsafe_allow_html=True)
    st.markdown('<div class="result-shell">', unsafe_allow_html=True)
    result_slot = st.empty()

    if generate_clicked:
        if not description:
            result_slot.warning("Please fill at least one field before generating.")
        else:
            payload = {
                "description": description,
                "steps": int(steps),
                "guidance": float(guidance),
                "width": 512,
                "height": 512,
            }

            try:
                with st.spinner("Generating sketch..."):
                    response = requests.post(
                        f"{backend_base_url}/generate-image-api",
                        json=payload,
                        timeout=180,
                    )
                data = response.json()
            except requests.RequestException as exc:
                result_slot.error(f"Cannot reach backend: {exc}")
            except ValueError:
                result_slot.error("Backend did not return JSON.")
            else:
                if response.status_code >= 400 or not data.get("success", False):
                    err = data.get("error") or f"HTTP {response.status_code}"
                    result_slot.error(f"Generation failed: {err}")
                else:
                    sketch_b64 = data.get("sketch") or data.get("portrait")
                    if not sketch_b64:
                        result_slot.error("Backend response does not include sketch image data.")
                    else:
                        try:
                            sketch_img = decode_base64_image(sketch_b64)
                        except Exception as exc:
                            result_slot.error(f"Invalid image payload: {exc}")
                        else:
                            result_slot.image(sketch_img, caption="Generated Sketch", width="stretch")
                            with st.expander("Prompt Details", expanded=False):
                                st.write("Prompt:")
                                st.code(data.get("prompt", ""))
                                st.write("Negative Prompt:")
                                st.code(data.get("negative", ""))
                                st.write("Seed:", data.get("seed", "n/a"))
                                st.write("Saved Image:", data.get("saved_image_path", "n/a"))
    st.markdown("</div>", unsafe_allow_html=True)

if __name__ == "__main__":
    pass
