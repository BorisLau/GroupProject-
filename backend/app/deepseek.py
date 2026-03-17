import json
import requests
from .config import get_settings


class DeepSeekError(Exception):
    pass


class RetryableDeepSeekError(DeepSeekError):
    pass


def _build_messages(document_text: str, title: str | None, max_nodes: int, language: str) -> list[dict]:
    topic = (title or "Uploaded Document").strip()

    system_prompt = (
        "You are a Mindmap Graph Planner. "
        "Return strictly valid JSON object only, no markdown. "
        "The JSON must follow this shape: "
        "{\"meta\":{\"title\":string,\"language\":string},"
        "\"nodes\":[{\"id\":string,\"label\":string,\"type\":string,\"parentId\":string|null}],"
        "\"edges\":[{\"id\":string,\"from\":string,\"to\":string,\"relation\":string}]}. "
        "node type should be one of root/concept/question/task/decision/resource/risk/note/milestone/group. "
        "relation should be one of parent/depends_on/supports/blocks/references/next. "
        "Keep output concise and avoid duplicates."
    )

    user_prompt = (
        f"Topic: {topic}\n"
        f"Language: {language}\n"
        f"Max nodes: {max_nodes}\n"
        "Document content:\n"
        f"{document_text[:120000]}\n\n"
        "Generate a mindmap graph JSON from the document content."
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def generate_mindmap_json(
    *,
    api_key: str,
    document_text: str,
    title: str | None,
    max_nodes: int,
    language: str,
) -> dict:
    settings = get_settings()
    endpoint = f"{settings.deepseek_base_url.rstrip('/')}/chat/completions"

    payload = {
        "model": settings.deepseek_model,
        "messages": _build_messages(document_text, title, max_nodes, language),
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    try:
        response = requests.post(
            endpoint,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=90,
        )
    except requests.RequestException as exc:
        raise RetryableDeepSeekError("DeepSeek request failed") from exc

    if response.status_code in {429, 500, 502, 503, 504}:
        raise RetryableDeepSeekError(f"DeepSeek temporary error: {response.status_code}")

    if response.status_code >= 400:
        raise DeepSeekError(f"DeepSeek request rejected: {response.status_code} {response.text[:200]}")

    try:
        body = response.json()
        content = body["choices"][0]["message"]["content"]
    except Exception as exc:  # noqa: BLE001
        raise DeepSeekError("Unexpected DeepSeek response format") from exc

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise DeepSeekError("DeepSeek returned non-JSON content") from exc
