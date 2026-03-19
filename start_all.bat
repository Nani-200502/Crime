@echo off
setlocal

cd /d "%~dp0"

set "PY=.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo [ERROR] Virtual environment not found at .venv\Scripts\python.exe
  echo Create it first with: uv venv .venv
  exit /b 1
)

echo [1/5] Checking uv...
"%PY%" -m uv --version >nul 2>&1
if errorlevel 1 (
  echo uv not found in venv. Installing uv...
  "%PY%" -m pip install uv || (
    echo [ERROR] Failed to install uv.
    exit /b 1
  )
)

echo [2/5] Installing Python dependencies...
"%PY%" -m uv pip install -r requirements.txt || (
  echo [ERROR] Python dependency installation failed.
  exit /b 1
)

echo [3/5] Installing frontend dependencies...
cd /d "%~dp0forensic-canvas"
call npm install || (
  echo [ERROR] Frontend dependency installation failed.
  exit /b 1
)

echo [4/5] Building frontend assets...
call npm run build || (
  echo [ERROR] Frontend build failed.
  exit /b 1
)

echo [5/5] Starting Flask app on http://127.0.0.1:5000 ...
cd /d "%~dp0"
start "Criminal Sketch App" cmd /k "cd /d "%~dp0" ^&^& "%PY%" -m backend.edge_api.app"

timeout /t 4 >nul
start "" "http://127.0.0.1:5000"

echo.
echo Application launched from one command.
echo - Run this file only: start_all.bat
echo - App URL: http://127.0.0.1:5000
echo.
exit /b 0
