from datetime import datetime, timezone
from uuid import uuid4
from .file_parser import extract_text_from_file
from .local_output import save_local_mindmap_json
from .mindmap_schema import finalize_generated_mindmap
from .openrouter_client import OpenRouterError, RetryableOpenRouterError, generate_mindmap_json
from .security import decrypt_secret
from .supabase_client import supabase_admin
from .config import get_settings

LEGACY_API_KEY_COLUMN = "deepseek_api_key_encrypted"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_encrypted_api_key(user_id: str) -> str:
    response = (
        supabase_admin.table("user_ai_settings")
        .select(LEGACY_API_KEY_COLUMN)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    data = getattr(response, "data", None)
    if not data or not data.get(LEGACY_API_KEY_COLUMN):
        raise ValueError("OpenRouter API key is not configured")

    return data[LEGACY_API_KEY_COLUMN]


def _generate_with_retry(*, api_key: str, document_text: str, title: str | None, max_nodes: int, language: str) -> dict:
    delay_seconds = 2
    attempts = 3

    for attempt in range(attempts):
        try:
            return generate_mindmap_json(
                api_key=api_key,
                document_text=document_text,
                title=title,
                max_nodes=max_nodes,
                language=language,
            )
        except RetryableOpenRouterError:
            if attempt >= attempts - 1:
                raise
            import time

            time.sleep(delay_seconds)
            delay_seconds *= 2

    raise OpenRouterError("OpenRouter generation failed after retries")


def generate_and_store_mindmap(
    *,
    user_id: str,
    file_bytes: bytes,
    file_name: str,
    mime_type: str | None,
    title: str | None,
    max_nodes: int,
    language: str,
) -> dict:
    settings = get_settings()
    extracted_text, file_type = extract_text_from_file(file_bytes, file_name=file_name, mime_type=mime_type)

    encrypted_api_key = _get_encrypted_api_key(user_id)
    api_key = decrypt_secret(encrypted_api_key)

    raw_graph = _generate_with_retry(
        api_key=api_key,
        document_text=extracted_text,
        title=title,
        max_nodes=max_nodes,
        language=language,
    )
    graph = finalize_generated_mindmap(
        raw_graph,
        max_nodes=max_nodes,
        title=title,
        language=language,
    )

    mindmap_id = str(uuid4())
    local_json_path = save_local_mindmap_json(job_id=mindmap_id, graph=graph)

    supabase_admin.table("mindmaps").insert(
        {
            "id": mindmap_id,
            "user_id": user_id,
            "source_file_name": file_name,
            "source_file_type": file_type,
            "model": settings.openrouter_model,
            "graph_json": graph,
            "created_at": _utc_now_iso(),
        }
    ).execute()

    return {
        "mindmap_id": mindmap_id,
        "graph_json": graph,
        "local_json_path": str(local_json_path),
        "local_json_ready": local_json_path.exists(),
    }
