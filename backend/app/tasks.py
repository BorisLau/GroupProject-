import base64
import time
from datetime import datetime, timezone
from .celery_app import celery_app
from .deepseek import DeepSeekError, RetryableDeepSeekError, generate_mindmap_json
from .file_parser import extract_text_from_file
from .local_output import save_local_mindmap_json
from .mindmap_schema import finalize_generated_mindmap
from .security import decrypt_secret
from .supabase_client import supabase_admin


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _update_job(job_id: str, user_id: str, patch: dict) -> None:
    supabase_admin.table("mindmap_jobs").update(patch).eq("id", job_id).eq("user_id", user_id).execute()


def _get_encrypted_api_key(user_id: str) -> str:
    response = (
        supabase_admin.table("user_ai_settings")
        .select("deepseek_api_key_encrypted")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    data = getattr(response, "data", None)
    if not data or not data.get("deepseek_api_key_encrypted"):
        raise ValueError("DeepSeek API key is not configured")

    return data["deepseek_api_key_encrypted"]


def _generate_with_retry(*, api_key: str, document_text: str, title: str | None, max_nodes: int, language: str) -> dict:
    delay = 2
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
        except RetryableDeepSeekError:
            if attempt >= attempts - 1:
                raise
            time.sleep(delay)
            delay *= 2

    raise DeepSeekError("DeepSeek generation failed after retries")


@celery_app.task(name="mindmap.process_job")
def process_mindmap_job(payload: dict) -> dict:
    job_id = payload["job_id"]
    user_id = payload["user_id"]
    file_name = payload["file_name"]
    mime_type = payload.get("mime_type")
    title = payload.get("title")
    max_nodes = int(payload.get("max_nodes", 50))
    language = payload.get("language") or "zh-TW"

    _update_job(
        job_id,
        user_id,
        {
            "status": "processing",
            "started_at": _utc_now_iso(),
            "error_message": None,
        },
    )

    try:
        file_bytes = base64.b64decode(payload["file_base64"])
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
        local_json_path = save_local_mindmap_json(job_id=job_id, graph=graph)

        insert_response = (
            supabase_admin.table("mindmaps")
            .insert(
                {
                    "user_id": user_id,
                    "source_file_name": file_name,
                    "source_file_type": file_type,
                    "model": "deepseek-chat",
                    "graph_json": graph,
                }
            )
            .execute()
        )
        data = getattr(insert_response, "data", None) or []
        if not data:
            raise RuntimeError("Failed to insert mindmap record")

        mindmap_id = data[0]["id"]

        _update_job(
            job_id,
            user_id,
            {
                "status": "succeeded",
                "mindmap_id": mindmap_id,
                "error_message": None,
                "finished_at": _utc_now_iso(),
            },
        )

        return {
            "job_id": job_id,
            "status": "succeeded",
            "mindmap_id": mindmap_id,
            "local_json_path": str(local_json_path),
        }
    except Exception as exc:  # noqa: BLE001
        _update_job(
            job_id,
            user_id,
            {
                "status": "failed",
                "error_message": str(exc)[:500],
                "finished_at": _utc_now_iso(),
            },
        )
        raise
