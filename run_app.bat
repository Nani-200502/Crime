@echo off
setlocal

cd /d "%~dp0"

set "PY=.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo [ERROR] Virtual environment not found at .venv\Scripts\python.exe
  echo Create it first with: uv venv .venv
  pause
  exit /b 1
)

echo [1/4] Checking uv...
"%PY%" -m uv --version >nul 2>&1
if errorlevel 1 (
  echo uv not found in venv. Installing uv...
  "%PY%" -m pip install uv || (
    echo [ERROR] Failed to install uv.
    pause
    exit /b 1
  )
)

echo [2/4] Installing/updating dependencies...
"%PY%" -m uv pip install -r requirements.txt || (
  echo [ERROR] Dependency installation failed.
  pause
  exit /b 1
)

echo [3/4] Starting backend API on http://127.0.0.1:5000 ...
start "Backend API" cmd /k "cd /d "%~dp0" && "%PY%" -m backend.edge_api.app"

timeout /t 3 >nul

echo [4/4] Starting Streamlit frontend on http://127.0.0.1:8501 ...
set "BACKEND_URL=http://127.0.0.1:5000"
start "Frontend Streamlit" cmd /k "cd /d "%~dp0" && set BACKEND_URL=%BACKEND_URL% && "%PY%" -m streamlit run frontend\streamlit_app.py --server.port 8501"

timeout /t 5 >nul
start "" "http://127.0.0.1:8501"

echo.
echo Application launched.
echo - Backend window: Backend API
echo - Frontend window: Frontend Streamlit
echo Close those windows to stop the app.
echo.
exit /b 0
