FROM node:20-alpine AS frontend-builder
WORKDIR /app/forensic-canvas
COPY forensic-canvas/package*.json ./
RUN npm ci
COPY forensic-canvas/ ./
RUN npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY configs/ ./configs/
COPY data/ ./data/
COPY docs/ ./docs/
COPY scripts/ ./scripts/
COPY run_app.bat ./run_app.bat
COPY start_all.bat ./start_all.bat
COPY README.md ./README.md
COPY architecture.md ./architecture.md

COPY forensic-canvas/ ./forensic-canvas/
COPY --from=frontend-builder /app/forensic-canvas/dist ./forensic-canvas/dist

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "backend.edge_api.app:app", "--workers", "2", "--threads", "4", "--timeout", "120"]
