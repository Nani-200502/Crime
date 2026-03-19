# Criminal Sketch Platform Architecture

## Objective
Build a secure, case-based criminal sketch platform using the existing Python Flask + Streamlit stack with Supabase Authentication, Supabase Database, and Supabase Storage.

## Core Principles
- All business endpoints require authentication.
- Each case is isolated by owner and case ID.
- All generated and refined sketches are versioned.
- Supabase Database and Supabase Storage are the source of truth.
- Frontend and backend are deployed as separate services on Render.

## System Components

### 1. Authentication Layer (Supabase Auth)
Responsibilities:
- User signup and login with email/password
- JWT-based sessions
- Password reset flow
- User metadata retrieval and role checks

Auth Rules:
- Public endpoint: health only
- Protected endpoints: all case, sketch, and refinement APIs
- Every protected request must include a valid bearer token

### 2. Database Layer (Supabase Postgres)
Stores all business entities and relationships.

Tables:
- users
  - id UUID primary key
  - email TEXT
  - created_at TIMESTAMP
- cases
  - case_id TEXT primary key
  - user_id UUID references users(id)
  - title TEXT
  - description TEXT
  - created_at TIMESTAMP default now()
- sketches
  - sketch_id TEXT primary key
  - case_id TEXT references cases(case_id)
  - image_url TEXT
  - version INT
  - created_at TIMESTAMP default now()
- refinements
  - refine_id TEXT primary key
  - case_id TEXT references cases(case_id)
  - attribute_type TEXT
  - description TEXT
  - x_coord FLOAT
  - y_coord FLOAT
  - created_at TIMESTAMP default now()

Recommended indexing:
- cases(user_id, created_at)
- sketches(case_id, created_at)
- refinements(case_id, created_at)

### 3. Storage Layer (Supabase Storage)
Stores generated and refined image assets.

Bucket strategy:
- private bucket recommended for investigative data
- signed URLs served to authenticated clients

Object path strategy:
- cases/{case_id}/sketches/sketch_{version}.png
- cases/{case_id}/refinements/refine_{version}.png

### 4. API Gateway Layer (Flask)
Main API app in backend/edge_api/app.py.

Responsibilities:
- Route handling
- Request validation
- Auth enforcement
- Supabase DB + Storage orchestration
- Adapter calls for generation and optional transcription

### 5. Generation and Refinement Services
Generation:
- Uses Hugging Face adapter in backend/adapters/provider_hf.py

Refinement:
- Applies treatment metadata and regeneration pipeline
- Supported attributes:
  - scars
  - birthmarks
  - moles
  - tattoos
  - injuries
  - skin texture
  - eye traits
  - mouth adjustments
  - nose adjustments
  - hairline patterns
  - free-form facial descriptors

## API Endpoints

### Public
- GET /health

### Auth
- POST /auth/signup
- POST /auth/login
- POST /auth/password-reset

### Cases
- POST /cases/create
- GET /cases/list
- GET /cases/{case_id}

### Sketch
- POST /sketch/generate

### Refinement
- POST /refine/add

## Request and Workflow Model

### Base Sketch Workflow
1. User logs in.
2. User creates or selects a case.
3. User submits suspect description.
4. Backend generates sketch image.
5. Image is uploaded to Supabase Storage.
6. Sketch metadata is written to sketches table.
7. Frontend displays current sketch and history.

### Refinement Workflow
1. User selects Add Refinement.
2. User chooses type and enters description.
3. Optional coordinates are provided from UI marker.
4. Backend stores refinement in refinements table.
5. Backend regenerates refined sketch.
6. Refined image is uploaded and versioned.
7. Frontend shows updated timeline with timestamp.

## Case-Based Project Structure

Recommended application structure:

project-root/
- backend/
  - edge_api/
    - app.py
  - adapters/
    - provider_hf.py
    - llm_groq.py
  - services/
    - auth/
    - database/
    - generation/
    - forensic/
    - storage/
  - schemas/
  - tests/
- frontend/
  - streamlit_app.py
- configs/
  - settings.example.env
- data/
  - temp/

Notes:
- Local image folders are no longer authoritative.
- Optional local temp files can be used during processing and then removed after upload.

## Security and Access Control
- Bearer token required for all non-health endpoints.
- Case ownership checks enforced on every read/write action.
- No direct unauthenticated access to case assets.
- Store all secrets only in environment variables.
- Never expose service role keys to frontend.

## Environment Configuration

Required backend variables:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_JWT_SECRET
- HF_TOKEN
- GROQ_API_KEY (optional)
- PENCIL_ONLY

Required frontend variable:
- BACKEND_URL

## Deployment Topology (Render)

### Backend Service (Flask)
- Deploy from repo
- Start command: python -m backend.edge_api.app
- Add backend environment variables in Render dashboard

### Frontend Service (Streamlit)
- Deploy from repo
- Start command: streamlit run frontend/streamlit_app.py --server.port $PORT --server.address 0.0.0.0
- Set BACKEND_URL to deployed backend URL

## Reliability and Observability
- Add request IDs for end-to-end tracing
- Log prompt hash instead of raw sensitive text where possible
- Handle retries and backoff for provider failures
- Return structured error responses

## Immediate Implementation Phases
1. Add Supabase auth and JWT middleware.
2. Add cases, sketches, refinements data services.
3. Move image persistence to Supabase Storage.
4. Add refinement API and versioned outputs.
5. Update Streamlit with auth, case workspace, and refinement UI.
6. Deploy backend and frontend on Render and run smoke tests.
