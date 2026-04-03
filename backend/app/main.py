import base64
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# 在应用启动前验证配置
try:
    from .config_validator import validate_config
    validate_config()  # 验证环境变量
except ImportError:
    pass  # 验证模块可选

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
    return {"ok": True, "env": settings.env}


# ... 其余路由代码保持不变 ...
