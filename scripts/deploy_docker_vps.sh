#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/crime-app}"
BRANCH="${BRANCH:-main}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed"
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is not installed"
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "APP_DIR does not contain a git repository: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose -f docker-compose.prod.yml up --build -d

echo "Waiting for service health..."
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:${APP_PORT:-5000}/health" >/dev/null 2>&1; then
    echo "Deployment successful"
    exit 0
  fi
  sleep 2
done

echo "Health check failed"
docker compose -f docker-compose.prod.yml logs --tail=200 app
exit 1
