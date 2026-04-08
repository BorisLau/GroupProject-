#!/usr/bin/env bash
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
ENV_FILE="${BACKEND_DIR}/cloudrun.env.yaml"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy cloudrun.env.yaml.example first." >&2
  exit 1
fi

SERVICE_NAME="${SERVICE_NAME:-ccit4080-backend}"
REGION="${REGION:-asia-east1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Set PROJECT_ID or run 'gcloud config set project <id>' first." >&2
  exit 1
fi

required_vars=(
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  APP_ENCRYPTION_KEY
)

missing_vars=()
for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing_vars+=("${name}")
  fi
done

if (( ${#missing_vars[@]} > 0 )); then
  printf 'Missing required environment variables for deploy: %s\n' "${missing_vars[*]}" >&2
  echo "Export them in your shell before running this script." >&2
  exit 1
fi

echo "Deploying ${SERVICE_NAME} to Cloud Run in ${REGION} (project ${PROJECT_ID})"

gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source "${BACKEND_DIR}" \
  --allow-unauthenticated \
  --memory "512Mi" \
  --cpu "1" \
  --concurrency "4" \
  --timeout "300" \
  --min-instances "0" \
  --max-instances "3" \
  --cpu-throttling \
  --no-cpu-boost \
  --env-vars-file "${ENV_FILE}" \
  --set-env-vars "SUPABASE_URL=${SUPABASE_URL},SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},APP_ENCRYPTION_KEY=${APP_ENCRYPTION_KEY}"
