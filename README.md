# Criminal Sketch Generator

## Flask Auth-First Web App

Active frontend: forensic-canvas (Lovable React/Vite) served by Flask from built dist assets.

Build frontend assets before starting Flask:

```powershell
Set-Location .\forensic-canvas
npm install
npm run build
Set-Location ..
```

Install dependencies with uv:

```powershell
.\.venv\Scripts\python.exe -m uv pip install -r requirements.txt
```

Run the application:

```powershell
\.venv\Scripts\python.exe -m backend.edge_api.app
```

Or use the launcher:

```powershell
./run_app.bat
```

Open in browser:

```text
http://127.0.0.1:5000
```

The root page is auth-first:
- Login / Signup / Password reset first
- After login, case workspace is shown

Core endpoints used by the web UI:
- POST /auth/login
- POST /auth/signup
- POST /auth/password-reset
- POST /cases/create
- GET /cases/list
- GET /cases/{case_id}/timeline
- POST /sketch/generate
- POST /refine/add
- POST /transcribe-audio-api
- POST /generate-image-api

Required storage environment variables:
- SUPABASE_STORAGE_BUCKET
- SUPABASE_SIGNED_URL_TTL_SECONDS

Rate limit configuration:
- RATE_LIMIT_WINDOW_SECONDS
- RATE_LIMIT_MAX_REQUESTS
- RATE_LIMIT_PATHS

Run smoke tests:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_smoke_phase5.py -q
```

Run deployment smoke checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deployment_smoke_check.ps1
```
