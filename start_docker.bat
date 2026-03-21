@echo off
setlocal

cd /d "%~dp0"

echo [1/1] Building and starting app with Docker Compose...
docker compose up --build -d || (
  echo [ERROR] Docker compose failed.
  exit /b 1
)

echo.
echo Docker app started.
echo - URL: http://127.0.0.1:5000
echo - Logs: docker compose logs -f
echo - Stop: docker compose down
echo.
exit /b 0
