from typing import Literal, Optional
from pydantic import BaseModel, Field

JobStatus = Literal["queued", "processing", "succeeded", "failed"]


class SaveApiKeyRequest(BaseModel):
    api_key: str = Field(min_length=8)


class SaveApiKeyResponse(BaseModel):
    ok: bool


class ApiKeyStatusResponse(BaseModel):
    has_key: bool


class CreateMindmapJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    local_json_path: Optional[str] = None
    local_json_ready: bool = False


class MindmapJobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    mindmap_id: Optional[str] = None
    error: Optional[str] = None
    local_json_path: Optional[str] = None
    local_json_ready: bool = False


class MindmapResponse(BaseModel):
    id: str
    graph_json: dict
