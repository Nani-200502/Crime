import base64
import os
from io import BytesIO
from typing import Tuple

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


def init_auth_state() -> None:
    if "auth_token" not in st.session_state:
        st.session_state["auth_token"] = ""
    if "auth_user" not in st.session_state:
        st.session_state["auth_user"] = {}
    if "selected_case_id" not in st.session_state:
        st.session_state["selected_case_id"] = ""


def auth_headers() -> dict:
    token = (st.session_state.get("auth_token") or "").strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def login_user(backend_base_url: str, email: str, password: str) -> Tuple[bool, str]:
    try:
        response = requests.post(
            f"{backend_base_url}/auth/login",
            json={"email": email, "password": password},
            timeout=60,
        )
        data = response.json()
    except requests.RequestException as exc:
        return False, f"Cannot reach backend: {exc}"
    except ValueError:
        return False, "Backend returned invalid JSON."

    if response.status_code >= 400 or not data.get("success", False):
        return False, data.get("error", f"HTTP {response.status_code}")

    st.session_state["auth_token"] = (data.get("access_token") or "").strip()
    st.session_state["auth_user"] = data.get("user") or {}
    if not st.session_state["auth_token"]:
        return False, "Login succeeded but access token was missing."
    return True, "Logged in successfully."


def signup_user(backend_base_url: str, email: str, password: str) -> Tuple[bool, str]:
    try:
        response = requests.post(
            f"{backend_base_url}/auth/signup",
            json={"email": email, "password": password},
            timeout=60,
        )
        data = response.json()
    except requests.RequestException as exc:
        return False, f"Cannot reach backend: {exc}"
    except ValueError:
        return False, "Backend returned invalid JSON."

    if response.status_code >= 400 or not data.get("success", False):
        return False, data.get("error", f"HTTP {response.status_code}")
    return True, "Signup request accepted. Check email if confirmation is enabled."


def request_password_reset(backend_base_url: str, email: str) -> Tuple[bool, str]:
    try:
        response = requests.post(
            f"{backend_base_url}/auth/password-reset",
            json={"email": email},
            timeout=60,
        )
        data = response.json()
    except requests.RequestException as exc:
        return False, f"Cannot reach backend: {exc}"
    except ValueError:
        return False, "Backend returned invalid JSON."

    if response.status_code >= 400 or not data.get("success", False):
        return False, data.get("error", f"HTTP {response.status_code}")
    return True, data.get("message", "Password reset request sent.")


def create_case(backend_base_url: str, title: str, description: str) -> Tuple[bool, str]:
    try:
        response = requests.post(
            f"{backend_base_url}/cases/create",
            json={"title": title, "description": description},
            headers=auth_headers(),
            timeout=60,
        )
        data = response.json()
    except requests.RequestException as exc:
        return False, f"Cannot reach backend: {exc}"
    except ValueError:
        return False, "Backend returned invalid JSON."

    if response.status_code >= 400 or not data.get("success", False):
        return False, data.get("error", f"HTTP {response.status_code}")

    case_data = data.get("case") or {}
    st.session_state["selected_case_id"] = case_data.get("case_id", "")
    return True, f"Case created: {case_data.get('case_id', 'unknown')}"


def fetch_cases(backend_base_url: str) -> Tuple[bool, list, str]:
    try:
        response = requests.get(
            f"{backend_base_url}/cases/list",
            headers=auth_headers(),
            timeout=60,
        )
        data = response.json()
    except requests.RequestException as exc:
        return False, [], f"Cannot reach backend: {exc}"
    except ValueError:
        return False, [], "Backend returned invalid JSON."

    if response.status_code >= 400 or not data.get("success", False):
        return False, [], data.get("error", f"HTTP {response.status_code}")
    return True, data.get("cases") or [], ""


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
init_auth_state()

with st.sidebar:
    st.divider()
    st.markdown("**Authentication**")
    current_user = st.session_state.get("auth_user") or {}
    user_email = current_user.get("email", "")
    is_logged_in = bool((st.session_state.get("auth_token") or "").strip())
    if is_logged_in:
        st.success(f"Signed in as {user_email or 'user'}")
        if st.button("Logout", width="stretch"):
            st.session_state["auth_token"] = ""
            st.session_state["auth_user"] = {}
            st.rerun()
    else:
        st.info("Sign in to use generation and voice features.")
        tab_login, tab_signup, tab_reset = st.tabs(["Login", "Signup", "Reset"])
        with tab_login:
            login_email = st.text_input("Email", key="login_email")
            login_password = st.text_input("Password", type="password", key="login_password")
            if st.button("Login", key="login_btn", width="stretch"):
                ok, message = login_user(backend_base_url, login_email.strip(), login_password)
                if ok:
                    st.success(message)
                    st.rerun()
                else:
                    st.error(message)

        with tab_signup:
            signup_email = st.text_input("Email", key="signup_email")
            signup_password = st.text_input("Password", type="password", key="signup_password")
            if st.button("Create Account", key="signup_btn", width="stretch"):
                ok, message = signup_user(backend_base_url, signup_email.strip(), signup_password)
                if ok:
                    st.success(message)
                else:
                    st.error(message)

        with tab_reset:
            reset_email = st.text_input("Email", key="reset_email")
            if st.button("Send Reset Link", key="reset_btn", width="stretch"):
                ok, message = request_password_reset(backend_base_url, reset_email.strip())
                if ok:
                    st.success(message)
                else:
                    st.error(message)

with st.sidebar:
    st.divider()
    st.markdown("**Cases**")
    is_logged_in = bool((st.session_state.get("auth_token") or "").strip())
    if not is_logged_in:
        st.caption("Login required for case workspace.")
    else:
        refresh_cases = st.button("Refresh Cases", key="refresh_cases", width="stretch")
        if refresh_cases or "cached_cases" not in st.session_state:
            ok, rows, err = fetch_cases(backend_base_url)
            if ok:
                st.session_state["cached_cases"] = rows
            else:
                st.error(err)
                st.session_state["cached_cases"] = []

        cached_cases = st.session_state.get("cached_cases") or []
        options = [""] + [c.get("case_id", "") for c in cached_cases if c.get("case_id")]
        current_case_id = st.session_state.get("selected_case_id", "")
        if current_case_id not in options:
            current_case_id = ""
        selected_case = st.selectbox(
            "Selected Case",
            options=options,
            index=options.index(current_case_id) if current_case_id in options else 0,
            format_func=lambda v: v if v else "(none)",
        )
        st.session_state["selected_case_id"] = selected_case

        with st.expander("Create New Case", expanded=False):
            new_case_title = st.text_input("Case Title", key="new_case_title")
            new_case_desc = st.text_area("Case Description", key="new_case_desc", height=80)
            if st.button("Create Case", key="create_case_btn", width="stretch"):
                ok, message = create_case(backend_base_url, new_case_title.strip(), new_case_desc.strip())
                if ok:
                    st.success(message)
                    ok2, rows2, err2 = fetch_cases(backend_base_url)
                    if ok2:
                        st.session_state["cached_cases"] = rows2
                    else:
                        st.error(err2)
                    st.rerun()
                else:
                    st.error(message)

with st.container(border=True):
    st.markdown('<div class="section-title">Voice Input (Groq Speech-to-Text)</div>', unsafe_allow_html=True)
    audio_value = st.audio_input("Record witness speech", key="audio_prompt")
    voice_col1, voice_col2 = st.columns([1, 2])
    transcribe_clicked = voice_col1.button("Transcribe Voice", width="stretch")
    voice_status = voice_col2.empty()

    if transcribe_clicked:
        if not (st.session_state.get("auth_token") or "").strip():
            voice_status.warning("Please login first.")
        elif audio_value is None:
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
                        headers=auth_headers(),
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
        if not (st.session_state.get("auth_token") or "").strip():
            result_slot.warning("Please login first.")
        elif not (st.session_state.get("selected_case_id") or "").strip():
            result_slot.warning("Please select or create a case first.")
        elif not description:
            result_slot.warning("Please fill at least one field before generating.")
        else:
            payload = {
                "description": description,
                "case_id": st.session_state.get("selected_case_id"),
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
                        headers=auth_headers(),
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
                                sketch_record = data.get("sketch_record") or {}
                                if sketch_record:
                                    st.write("Sketch Version:", sketch_record.get("version", "n/a"))
                                    st.write("Sketch ID:", sketch_record.get("sketch_id", "n/a"))
    st.markdown("</div>", unsafe_allow_html=True)

if __name__ == "__main__":
    pass
