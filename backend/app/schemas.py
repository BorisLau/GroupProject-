from typing import Optional
from pydantic import BaseModel, Field


class SaveApiKeyRequest(BaseModel):
    api_key: str = Field(min_length=8)


class SaveApiKeyResponse(BaseModel):
    ok: bool


class ApiKeyStatusResponse(BaseModel):
    has_key: bool


class GenerateMindmapResponse(BaseModel):
    mindmap_id: str
    graph_json: dict
    local_json_path: Optional[str] = None
    local_json_ready: bool = False


class MindmapResponse(BaseModel):
    id: str
    graph_json: dict
