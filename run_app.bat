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

echo [1/3] Checking uv...
"%PY%" -m uv --version >nul 2>&1
if errorlevel 1 (
  echo uv not found in venv. Installing uv...
  "%PY%" -m pip install uv || (
    echo [ERROR] Failed to install uv.
    pause
    exit /b 1
  )
)

echo [2/3] Installing/updating dependencies...
"%PY%" -m uv pip install -r requirements.txt || (
  echo [ERROR] Dependency installation failed.
  pause
  exit /b 1
)

echo [3/3] Starting Flask app on http://127.0.0.1:5000 ...
start "Criminal Sketch App" cmd /k "cd /d "%~dp0" && "%PY%" -m backend.edge_api.app"

timeout /t 4 >nul
start "" "http://127.0.0.1:5000"

echo.
echo Application launched.
echo - App window: Criminal Sketch App
echo Close that window to stop the app.
echo.
exit /b 0
