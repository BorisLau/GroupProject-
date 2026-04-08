from datetime import datetime, timezone
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from .auth import get_current_user
from .config import get_settings
from .file_parser import UnsupportedFileTypeError, detect_file_type
from .mindmap_service import generate_and_store_mindmap
from .schemas import (
    ApiKeyStatusResponse,
    GenerateMindmapResponse,
    MindmapResponse,
    SaveApiKeyRequest,
    SaveApiKeyResponse,
)
from .security import encrypt_secret
from .supabase_client import supabase_admin
from fastapi.middleware.cors import CORSMiddleware

settings = get_settings()
app = FastAPI(title=settings.app_name)
LEGACY_API_KEY_COLUMN = "deepseek_api_key_encrypted"

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


@app.get("/health")
def health() -> dict:
    return {"ok": True}


def _save_openrouter_key(payload: SaveApiKeyRequest, user: dict) -> SaveApiKeyResponse:
    encrypted = encrypt_secret(payload.api_key)

    supabase_admin.table("user_ai_settings").upsert(
        {
            "user_id": user["id"],
            LEGACY_API_KEY_COLUMN: encrypted,
            "updated_at": _utc_now_iso(),
        },
        on_conflict="user_id",
    ).execute()

    return SaveApiKeyResponse(ok=True)


@app.put("/v1/settings/openrouter-key", response_model=SaveApiKeyResponse)
def save_openrouter_key_put(payload: SaveApiKeyRequest, user=Depends(get_current_user)) -> SaveApiKeyResponse:
    return _save_openrouter_key(payload, user)


@app.post("/v1/settings/openrouter-key", response_model=SaveApiKeyResponse)
def save_openrouter_key_post(payload: SaveApiKeyRequest, user=Depends(get_current_user)) -> SaveApiKeyResponse:
    return _save_openrouter_key(payload, user)


@app.put("/v1/settings/deepseek-key", response_model=SaveApiKeyResponse)
def save_deepseek_key_put(payload: SaveApiKeyRequest, user=Depends(get_current_user)) -> SaveApiKeyResponse:
    return _save_openrouter_key(payload, user)


@app.post("/v1/settings/deepseek-key", response_model=SaveApiKeyResponse)
def save_deepseek_key_post(payload: SaveApiKeyRequest, user=Depends(get_current_user)) -> SaveApiKeyResponse:
    return _save_openrouter_key(payload, user)


@app.get("/v1/settings/openrouter-key/status", response_model=ApiKeyStatusResponse)
def openrouter_key_status(user=Depends(get_current_user)) -> ApiKeyStatusResponse:
    response = (
        supabase_admin.table("user_ai_settings")
        .select(LEGACY_API_KEY_COLUMN)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    data = getattr(response, "data", None) or []
    has_key = any(row.get(LEGACY_API_KEY_COLUMN) for row in data if isinstance(row, dict))
    return ApiKeyStatusResponse(has_key=has_key)


@app.get("/v1/settings/deepseek-key/status", response_model=ApiKeyStatusResponse)
def deepseek_key_status(user=Depends(get_current_user)) -> ApiKeyStatusResponse:
    return openrouter_key_status(user)


@app.post("/v1/mindmaps/generate", response_model=GenerateMindmapResponse)
async def generate_mindmap(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    max_nodes: int = Form(default=50),
    language: str = Form(default="zh-TW"),
    user=Depends(get_current_user),
) -> GenerateMindmapResponse:
    if max_nodes <= 0 or max_nodes > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="max_nodes must be between 1 and 200")

    key_status = (
        supabase_admin.table("user_ai_settings")
        .select(LEGACY_API_KEY_COLUMN)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    key_rows = getattr(key_status, "data", None) or []
    has_key = any(row.get(LEGACY_API_KEY_COLUMN) for row in key_rows if isinstance(row, dict))
    if not has_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenRouter API key is not configured. Please set it in Settings first.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    if len(file_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    file_name = file.filename or "upload.bin"
    try:
        detect_file_type(file_name=file_name, mime_type=file.content_type)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        result = generate_and_store_mindmap(
            user_id=user["id"],
            file_bytes=file_bytes,
            file_name=file_name,
            mime_type=file.content_type,
            title=title,
            max_nodes=max_nodes,
            language=language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return GenerateMindmapResponse(**result)


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
