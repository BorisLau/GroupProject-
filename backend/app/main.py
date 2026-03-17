import base64
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from .auth import get_current_user
from .config import get_settings
from .file_parser import UnsupportedFileTypeError, detect_file_type
from .local_output import build_local_mindmap_json_path
from .schemas import (
    ApiKeyStatusResponse,
    CreateMindmapJobResponse,
    MindmapJobStatusResponse,
    MindmapResponse,
    SaveApiKeyRequest,
    SaveApiKeyResponse,
)
from .security import encrypt_secret
from .supabase_client import supabase_admin
from .tasks import process_mindmap_job

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_single_row(response) -> dict | None:
    data = getattr(response, "data", None)
    if isinstance(data, dict):
        return data
    if isinstance(data, list) and data:
        return data[0]
    return None


def _load_job_row(job_id: str, user_id: str) -> dict:
    try:
        response = (
            supabase_admin.table("mindmap_jobs")
            .select("id,status,mindmap_id,error_message")
            .eq("id", job_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found") from exc

    row = _read_single_row(response)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return row


@app.get("/health")
def health() -> dict:
    return {"ok": True}


def _save_deepseek_key(payload: SaveApiKeyRequest, user: dict) -> SaveApiKeyResponse:
    encrypted = encrypt_secret(payload.api_key)

    supabase_admin.table("user_ai_settings").upsert(
        {
            "user_id": user["id"],
            "deepseek_api_key_encrypted": encrypted,
            "updated_at": _utc_now_iso(),
        },
        on_conflict="user_id",
    ).execute()

    return SaveApiKeyResponse(ok=True)


@app.put("/v1/settings/deepseek-key", response_model=SaveApiKeyResponse)
def save_deepseek_key_put(payload: SaveApiKeyRequest, user=Depends(get_current_user)) -> SaveApiKeyResponse:
    return _save_deepseek_key(payload, user)


@app.post("/v1/settings/deepseek-key", response_model=SaveApiKeyResponse)
def save_deepseek_key_post(payload: SaveApiKeyRequest, user=Depends(get_current_user)) -> SaveApiKeyResponse:
    return _save_deepseek_key(payload, user)


@app.get("/v1/settings/deepseek-key/status", response_model=ApiKeyStatusResponse)
def deepseek_key_status(user=Depends(get_current_user)) -> ApiKeyStatusResponse:
    response = (
        supabase_admin.table("user_ai_settings")
        .select("user_id")
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    data = getattr(response, "data", None) or []
    return ApiKeyStatusResponse(has_key=len(data) > 0)


@app.post("/v1/mindmap/jobs", response_model=CreateMindmapJobResponse)
async def create_mindmap_job(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    max_nodes: int = Form(default=50),
    language: str = Form(default="zh-TW"),
    user=Depends(get_current_user),
) -> CreateMindmapJobResponse:
    if max_nodes <= 0 or max_nodes > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="max_nodes must be between 1 and 200")

    key_status = (
        supabase_admin.table("user_ai_settings")
        .select("user_id")
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not (getattr(key_status, "data", None) or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DeepSeek API key is not configured. Please set it in Settings first.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    if len(file_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    file_name = file.filename or "upload.bin"
    try:
        file_type = detect_file_type(file_name=file_name, mime_type=file.content_type)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    job_id = str(uuid4())

    supabase_admin.table("mindmap_jobs").insert(
        {
            "id": job_id,
            "user_id": user["id"],
            "status": "queued",
            "file_name": file_name,
            "file_type": file_type,
            "created_at": _utc_now_iso(),
            "title": title,
            "max_nodes": max_nodes,
            "language": language,
        }
    ).execute()

    payload = {
        "job_id": job_id,
        "user_id": user["id"],
        "file_name": file_name,
        "mime_type": file.content_type,
        "file_base64": base64.b64encode(file_bytes).decode("utf-8"),
        "title": title,
        "max_nodes": max_nodes,
        "language": language,
    }

    try:
        process_mindmap_job.delay(payload)
    except Exception as exc:  # noqa: BLE001
        supabase_admin.table("mindmap_jobs").update(
            {
                "status": "failed",
                "error_message": f"Queue dispatch failed: {str(exc)[:200]}",
                "finished_at": _utc_now_iso(),
            }
        ).eq("id", job_id).eq("user_id", user["id"]).execute()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to queue job") from exc

    local_json_path = build_local_mindmap_json_path(job_id)
    return CreateMindmapJobResponse(
        job_id=job_id,
        status="queued",
        local_json_path=str(local_json_path),
        local_json_ready=local_json_path.exists(),
    )


@app.get("/v1/mindmap/jobs/{job_id}", response_model=MindmapJobStatusResponse)
def get_mindmap_job(job_id: str, user=Depends(get_current_user)) -> MindmapJobStatusResponse:
    row = _load_job_row(job_id, user["id"])
    local_json_path = build_local_mindmap_json_path(job_id)

    return MindmapJobStatusResponse(
        job_id=row["id"],
        status=row["status"],
        mindmap_id=row.get("mindmap_id"),
        error=row.get("error_message"),
        local_json_path=str(local_json_path),
        local_json_ready=local_json_path.exists(),
    )


@app.get("/v1/mindmap/jobs/{job_id}/local-json")
def get_local_mindmap_json(job_id: str, user=Depends(get_current_user)) -> FileResponse:
    _load_job_row(job_id, user["id"])
    local_json_path = build_local_mindmap_json_path(job_id)
    if not local_json_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local JSON not generated yet")

    return FileResponse(
        path=local_json_path,
        media_type="application/json",
        filename=f"{job_id}.json",
    )


@app.get("/v1/mindmaps/{mindmap_id}", response_model=MindmapResponse)
def get_mindmap(mindmap_id: str, user=Depends(get_current_user)) -> MindmapResponse:
    try:
        response = (
            supabase_admin.table("mindmaps")
            .select("id,graph_json")
            .eq("id", mindmap_id)
            .eq("user_id", user["id"])
            .single()
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mindmap not found") from exc

    row = _read_single_row(response)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mindmap not found")

    return MindmapResponse(id=row["id"], graph_json=row["graph_json"])
