# Mindmap AI Backend (FastAPI + Celery)

This backend accepts uploaded files, generates mindmap JSON with DeepSeek, and stores the result in Supabase.

## Stack
- FastAPI API server
- Celery worker + Redis queue
- Supabase (Postgres)
- DeepSeek Chat Completions API

## Setup
1. Create and activate Python venv
2. Install deps

```bash
pip install -r requirements.txt
```

3. Copy env template

```bash
cp .env.example .env
```

4. Fill `.env` values (`SUPABASE_*`, `APP_ENCRYPTION_KEY`, etc.)

## Run locally
Start Redis first, then run API and worker in separate terminals:

```bash
uvicorn app.main:app --reload --port 8000
```

```bash
celery -A celery_worker.celery_app worker --loglevel=info
```

## Deploy to Render
This project can run on Render with:
- 1 Web Service for FastAPI
- 1 Background Worker for Celery
- 1 Key Value instance for Redis-compatible queueing

The repo root includes [render.yaml](../render.yaml) for a Blueprint-based setup.

### Render services
- `ccit4080-backend`: FastAPI API server
- `ccit4080-worker`: Celery worker
- `ccit4080-redis`: Render Key Value instance

### Required Render environment variables
Set these during Blueprint creation when Render prompts for `sync: false` values:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`
- `CORS_ORIGINS`

Notes:
- `APP_ENCRYPTION_KEY` should be a Fernet key.
- `REDIS_URL` is injected automatically from the Key Value service.
- `LOCAL_MINDMAP_OUTPUT_DIR` is set to `/tmp/mindmaps` on Render because the filesystem is ephemeral.

### FastAPI start command on Render
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Celery worker start command on Render
```bash
celery -A celery_worker.celery_app worker --loglevel=info
```

## API
- `PUT /v1/settings/deepseek-key`
- `GET /v1/settings/deepseek-key/status`
- `POST /v1/mindmap/jobs` (multipart: `file`, optional `title`, `max_nodes`, `language`)
- `GET /v1/mindmap/jobs/{job_id}`
- `GET /v1/mindmap/jobs/{job_id}/local-json`
- `GET /v1/mindmaps/{mindmap_id}`

All `/v1/*` endpoints require `Authorization: Bearer <supabase_access_token>`.

## Notes
- Supported file types in v1: TXT / MD / PDF / DOCX
- Raw uploaded file is not persisted
- Mindmap JSON is validated and normalized before storing
- Normalized mindmap JSON is also written locally to `backend/local_output/mindmaps/<job_id>.json` by default
