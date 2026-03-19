# Criminal Sketch Platform Architecture

## Objective
Design a microservices-friendly backend around a simple Flask application so eyewitness input, sketch generation, and forensic post-processing can scale independently without auth or database complexity.

## Current Core Runtime
- Primary app: Flask edge app in `backend/edge_api/app.py`
- Runtime mode:
  - API/web mode: `python main.py --serve` (runs on port 5000)
  - CLI mode: `python main.py --description "..."`
- Key dependencies from `requirements.txt`:
  - compel
  - opencv-python
  - numpy
  - pillow
  - boto3
  - transformers

## Proposed Microservices Layout

### 1) API Gateway / Web App (Flask Edge)
Responsibilities:
- Serve API endpoints for frontend clients
- Request validation and routing to downstream services
- API response contract for frontend/mobile clients

Frontend choice:
- Simple Streamlit app at `frontend/streamlit_app.py`
- Streamlit calls Flask endpoint `POST /generate-image-api`

Routes currently in edge app:
- `POST /generate-image-api`
- `POST /generate-batch-api`
- `POST /generate-forensic-api`


Future role:
- Keep this as orchestrator while moving heavy logic to internal services.

### 2) Prompt Service
Responsibilities:
- Parse witness description into attributes
- Build positive/negative prompts
- Apply weighting rules and safety constraints
- Optional LLM prompt cleanup (Groq) before generation

Inputs:
- Free text description and/or structured attributes

Outputs:
- `prompt`
- `negative_prompt`
- extracted `attributes`

Why separate:
- Prompt behavior evolves fast; this should be deployable without touching image runtime.

### 3) Image Generation Service
Responsibilities:
- Run text-to-image generation (local model now, HF API later)
- Enforce generation caps (steps, size, seed handling)
- Return normalized portrait/sketch payload

Current logic source:
- `load_pipe(...)`
- `generate_image(...)`
- route handlers in `main.py` for single and batch generation

Future provider adapters:
- `provider=local` (current)
- `provider=hf` (recommended free-first cloud)

### 4) Forensic Post-Processing Service
Responsibilities:
- Mark overlays (scars, moles, cap, mask)
- Face-shape outline and deterministic sketch refinements
- Optional inpainting/morphing refinement when explicitly requested

Current logic source:
- `_finalize_sketch_from_portrait(...)`
- `_apply_face_shape_outline(...)`
- `_apply_requested_marks_to_sketch(...)`
- `/generate-forensic-api` path

### 5) Storage Service Layer
Responsibilities:
- Unified read/write abstraction for local disk and S3
- Public/private URL generation policy
- Migration-safe image retrieval

Current signals in code:
- `USE_S3`, `S3_BUCKET`, `AWS_REGION`, `S3_PREFIX`, `S3_ENDPOINT_URL`
- `write_image_pair(...)`, `read_image_bytes(...)`

## Service-to-Service Flow

### A. Single Sketch Generation (API)
1. Client sends `POST /generate-image-api` with description and options.
2. API Gateway validates request and gets attributes + prompt.
3. Image Generation Service produces portrait/sketch.
4. Forensic Service applies overlays/refinements.
5. Storage Layer persists final artifacts to local folders or object storage.
6. API Gateway returns JSON with base64 image, prompt, seed, metadata.

### B. Batch Generation
1. Client sends `POST /generate-batch-api` with descriptions list.
2. API Gateway creates per-item jobs (sync now, async queue later).
3. Prompt + Generation + Forensic pipeline runs per item.
4. Aggregated results are returned with success/error per index.

### C. Forensic-Enhanced Flow
1. Client sends `POST /generate-forensic-api` with marks/quality/emphasis.
2. Prompt Service applies forensic emphasis.
3. Generation Service creates base portrait.
4. Forensic Service applies requested marks and sketch conversion.
5. Response includes `marks_applied` and forensic detail metadata.

## Data Contracts (Recommended)

### Generate Request (normalized)
```json
{
  "description": "male, round face, scar on left cheek",
  "mode": "pencil",
  "model": "sd1.5",
  "steps": 20,
  "guidance": 7.5,
  "width": 512,
  "height": 512,
  "seed": 12345,
  "marks": ["scar_cheek"],
  "refine_shape": false
}
```

### Generate Response (normalized)
```json
{
  "success": true,
  "image": {
    "sketch_base64": "...",
    "portrait_base64": "..."
  },
  "prompt": {
    "positive": "...",
    "negative": "..."
  },
  "meta": {
    "seed": 12345,
    "provider": "local",
    "model": "sd1.5",
    "latency_ms": 0
  }
}
```

## Deployment Topology

### Stage 1 (Current-Compatible)
- Single Flask process, modularized internally as service layers.
- Fastest path with minimal rewrite.

### Stage 2 (Microservices)
- Split into deployable services:
  - `edge-api`
  - `prompt-service`
  - `generation-service`
  - `forensic-service`
- Add queue (`Redis + RQ/Celery`) for batch and expensive tasks.

### Stage 3 (Cloud API Provider)
- Keep same contracts, replace generation adapter to Hugging Face API.
- Optional Groq adapter only for prompt cleanup/normalization.

## Reliability and Observability
- Use request IDs end-to-end.
- Log prompt hash, not raw sensitive witness text where possible.
- Add retries/backoff for provider calls.
- Add health endpoints:
  - `/health/live`
  - `/health/ready`
- Add metrics:
  - generation latency
  - provider errors
  - queue depth
  - cache hit rate

## Security
- Keep all tokens server-side (`HF_TOKEN`, optional `GROQ_API_KEY`, AWS keys).
- Validate and cap input sizes (`steps`, image dimensions, description length).
- Add simple IP-based rate limits at edge API.
- Avoid returning internal stack traces in API errors.

## Recommended Folder Target (Incremental)
```
backend/
  edge_api/
    app.py
  services/
    prompt/
    generation/
    forensic/
    storage/
  adapters/
    provider_local.py
    provider_hf.py
    llm_groq.py
  schemas/
  tests/
frontend/
  streamlit_app.py
configs/
  settings.example.env
data/
  images/
  temp/
scripts/
docs/
```

## uv-based Python Environment Workflow
Use uv for both env and package installs (no pip direct usage):

```powershell
uv venv .venv
.\.venv\Scripts\Activate.ps1
uv pip install -r requirements.txt
```

If `uv` is not available on PATH on Windows, use the module form:

```powershell
.\.venv\Scripts\python.exe -m uv --version
.\.venv\Scripts\python.exe -m uv pip install -r requirements.txt
```

Optional add-ons:
```powershell
uv pip install flask gunicorn python-dotenv
```

Run server:
```powershell
python backend/edge_api/app.py
```

## Immediate Next Steps
1. Refactor `main.py` route handlers to call service modules (no behavior change yet).
2. Introduce provider adapter interface and move generation behind it.
3. Add Hugging Face provider implementation first, keeping local as fallback.
4. Add async queue for `/generate-batch-api`.
