# AI CRIMINAL SKETCH GENERATOR

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

## Docker Deployment (Easy)

Run with one command on Windows:

```powershell
./start_docker.bat
```

Or with docker compose directly:

```powershell
docker compose up --build -d
```

Open:

```text
http://127.0.0.1:5000
```

Useful docker commands:

```powershell
docker compose logs -f
docker compose down
```

## Easiest Cloud Deployment (Render)

This repo includes `render.yaml` and a cloud-ready `Dockerfile` command that binds to Render's dynamic `PORT`.

### Quick steps

1. Push your latest code to GitHub.
2. Go to Render dashboard and click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect `render.yaml` and create the web service.
5. In Render service settings, add required environment variables from your local `.env`:
	- `HF_TOKEN`
	- `GROQ_API_KEY`
	- `SUPABASE_URL`
	- `SUPABASE_DB_URL`
	- `SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `SUPABASE_JWT_SECRET`
	- `SUPABASE_STORAGE_BUCKET`
	- `SUPABASE_SIGNED_URL_TTL_SECONDS`
	- `PENCIL_ONLY`
6. Deploy. Render checks `/health` automatically.

### Notes

- Free plans may sleep after inactivity and have cold starts.
- Rotate any secrets that were previously exposed in logs or commits.

## Reliable Cloud Deployment (Docker on VPS)

If you want maximum control and reliability, run the app on your own VPS using Docker Compose.

### 1. Provision a VPS

- Ubuntu 22.04+ (recommended)
- At least 2 vCPU / 4 GB RAM
- Open inbound ports: 22, 80, 443, and optionally 5000

### 2. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Re-login once after adding your user to the docker group.

### 3. Deploy the app

```bash
git clone https://github.com/Nani-200502/Crime.git ~/crime-app
cd ~/crime-app
cp configs/settings.example.env .env
# Edit .env and set real secret values
docker compose -f docker-compose.prod.yml up --build -d
curl http://127.0.0.1:5000/health
```

### 4. One-command updates

Use the provided script on the server:

```bash
chmod +x scripts/deploy_docker_vps.sh
APP_DIR=$HOME/crime-app BRANCH=main ./scripts/deploy_docker_vps.sh
```

### 5. Recommended hardening

- Put Nginx or Caddy in front of the app for HTTPS (LetsEncrypt)
- Keep `.env` only on the server, never in git
- Rotate HF/Supabase/Groq secrets if previously exposed
