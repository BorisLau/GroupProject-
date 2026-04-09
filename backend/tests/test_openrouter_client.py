from types import SimpleNamespace
import pytest
from app.openrouter_client import OpenRouterError, generate_mindmap_json


class _FakeResponse:
    def __init__(self, *, status_code: int = 200, body: dict | None = None, text: str = ""):
        self.status_code = status_code
        self._body = body or {}
        self.text = text

    def json(self) -> dict:
        return self._body


def test_generate_mindmap_json_calls_openrouter(monkeypatch):
    captured: dict = {}

    def fake_post(url, *, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        captured["timeout"] = timeout
        return _FakeResponse(
            body={
                "choices": [
                    {
                        "message": {
                            "content": '{"meta":{"title":"Doc","language":"zh-TW"},"nodes":[],"edges":[]}'
                        }
                    }
                ]
            }
        )

    monkeypatch.setattr(
        "app.openrouter_client.get_settings",
        lambda: SimpleNamespace(
            openrouter_base_url="https://openrouter.ai/api/v1",
            openrouter_model="deepseek/deepseek-chat",
            openrouter_site_url="https://example.com/app",
            openrouter_app_title="Smart Map",
            app_name="mindmap-backend",
        ),
    )
    monkeypatch.setattr("app.openrouter_client.requests.post", fake_post)

    result = generate_mindmap_json(
        api_key="test-key",
        document_text="hello world",
        title="Doc",
        max_nodes=10,
        language="zh-TW",
    )

    assert captured["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured["json"]["model"] == "deepseek/deepseek-chat"
    assert "three-level hierarchy" in captured["json"]["messages"][0]["content"]
    assert "\"group\":string?" in captured["json"]["messages"][0]["content"]
    assert "prefer three layers of classification" in captured["json"]["messages"][1]["content"]
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["headers"]["HTTP-Referer"] == "https://example.com/app"
    assert captured["headers"]["X-Title"] == "Smart Map"
    assert captured["timeout"] == 90
    assert result["meta"]["title"] == "Doc"


def test_generate_mindmap_json_rejects_non_json_response(monkeypatch):
    monkeypatch.setattr(
        "app.openrouter_client.get_settings",
        lambda: SimpleNamespace(
            openrouter_base_url="https://openrouter.ai/api/v1",
            openrouter_model="deepseek/deepseek-chat",
            openrouter_site_url=None,
            openrouter_app_title=None,
            app_name="mindmap-backend",
        ),
    )
    monkeypatch.setattr(
        "app.openrouter_client.requests.post",
        lambda *args, **kwargs: _FakeResponse(
            body={"choices": [{"message": {"content": "not json"}}]}
        ),
    )

    with pytest.raises(OpenRouterError, match="non-JSON"):
        generate_mindmap_json(
            api_key="test-key",
            document_text="hello world",
            title="Doc",
            max_nodes=10,
            language="zh-TW",
        )
