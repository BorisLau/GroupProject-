# Mindmap AI Backend (FastAPI for Cloud Run)

This backend accepts uploaded files, generates mindmap JSON through OpenRouter in a single request, and stores the result in Supabase.

## Stack
- FastAPI API server
- Supabase (Auth + Postgres)
- OpenRouter Chat Completions API

## Setup
1. Create and activate a Python virtual environment.
2. Install dependencies.

```bash
pip install -r requirements.txt
```

For local tests:

```bash
pip install -r requirements-dev.txt
```

3. Copy the env template.

```bash
cp .env.example .env
```

4. Fill `.env` values (`SUPABASE_*`, `APP_ENCRYPTION_KEY`, etc.).

## Run locally

```bash
uvicorn app.main:app --reload --port 8000
```

## Deploy to Cloud Run
This backend is designed to run as a single Cloud Run service.

### Lowest-cost baseline
- `min-instances=0` so idle cost stays at zero
- `memory=512Mi` and `cpu=1` to keep request cost low
- `concurrency=4` to avoid spinning up too many instances for light traffic
- `max-instances=3` so bursts stay bounded
- `timeout=300s` which is enough for typical uploads without paying for overly long requests

### Required environment variables
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`
- `CORS_ORIGINS`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_MODEL`
- `MAX_UPLOAD_SIZE_BYTES`
- `LOCAL_MINDMAP_OUTPUT_DIR`

Recommended Cloud Run value:
- `LOCAL_MINDMAP_OUTPUT_DIR=/tmp/mindmaps`

### Build and deploy
1. Copy the example env file and fill in the non-secret values:

```bash
cp backend/cloudrun.env.yaml.example backend/cloudrun.env.yaml
```

2. Export the secret values in your shell:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export APP_ENCRYPTION_KEY="..."
```

3. Run the deploy script from the repo root:

```bash
chmod +x backend/scripts/deploy_cloud_run.sh
PROJECT_ID=your-gcp-project SERVICE_NAME=ccit4080-backend REGION=asia-east1 \
  backend/scripts/deploy_cloud_run.sh
```

4. Fetch the deployed service URL:

```bash
gcloud run services describe ccit4080-backend \
  --region asia-east1 \
  --format='value(status.url)'
```

5. Put that URL into the frontend `.env` as `EXPO_PUBLIC_BACKEND_URL`, then restart Expo:

```bash
npx expo start -c
```

### Service settings
- Request timeout: start with `300` seconds.
- Memory: start with `512 MiB`. Raise to `1 GiB` only if large PDFs/docx files fail.
- CPU: `1`
- Scaling: `min-instances=0`, `max-instances=3`
- Billing: request-based with CPU throttling enabled

## API
- `PUT /v1/settings/openrouter-key`
- `GET /v1/settings/openrouter-key/status`
- `POST /v1/mindmaps/generate` (multipart: `file`, optional `title`, `max_nodes`, `language`)
- `GET /v1/mindmaps/{mindmap_id}`

Legacy DeepSeek routes remain available as aliases:
- `PUT /v1/settings/deepseek-key`
- `GET /v1/settings/deepseek-key/status`

All `/v1/*` endpoints require `Authorization: Bearer <supabase_access_token>`.

## Notes
- Supported file types in v1: TXT / MD / PDF / DOCX
- Raw uploaded file is not persisted
- Mindmap JSON is validated and normalized before storing
- Normalized mindmap JSON is also written locally to `backend/local_output/mindmaps/<mindmap_id>.json` by default
- The legacy `mindmap_jobs` table can remain in Supabase, but the current Cloud Run flow does not use it
