import json
import requests
from .config import get_settings


class OpenRouterError(Exception):
    pass


class RetryableOpenRouterError(OpenRouterError):
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


def _build_headers(api_key: str) -> dict[str, str]:
    settings = get_settings()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-Title": settings.openrouter_app_title or settings.app_name,
    }

    if settings.openrouter_site_url:
        headers["HTTP-Referer"] = settings.openrouter_site_url

    return headers


def _extract_content(body: dict) -> str:
    try:
        content = body["choices"][0]["message"]["content"]
    except Exception as exc:  # noqa: BLE001
        raise OpenRouterError("Unexpected OpenRouter response format") from exc

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text_parts.append(item.get("text", ""))
        if text_parts:
            return "".join(text_parts)

    raise OpenRouterError("OpenRouter returned unsupported message content")


def generate_mindmap_json(
    *,
    api_key: str,
    document_text: str,
    title: str | None,
    max_nodes: int,
    language: str,
) -> dict:
    settings = get_settings()
    endpoint = f"{settings.openrouter_base_url.rstrip('/')}/chat/completions"

    payload = {
        "model": settings.openrouter_model,
        "messages": _build_messages(document_text, title, max_nodes, language),
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    try:
        response = requests.post(
            endpoint,
            json=payload,
            headers=_build_headers(api_key),
            timeout=90,
        )
    except requests.RequestException as exc:
        raise RetryableOpenRouterError("OpenRouter request failed") from exc

    if response.status_code in {429, 500, 502, 503, 504}:
        raise RetryableOpenRouterError(f"OpenRouter temporary error: {response.status_code}")

    if response.status_code >= 400:
        raise OpenRouterError(
            f"OpenRouter request rejected: {response.status_code} {response.text[:300]}"
        )

    try:
        body = response.json()
        content = _extract_content(body)
    except OpenRouterError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise OpenRouterError("Unexpected OpenRouter response format") from exc

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise OpenRouterError("OpenRouter returned non-JSON content") from exc
