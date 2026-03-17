import json
from pathlib import Path
from app.config import BASE_DIR, get_settings
from app.local_output import build_local_mindmap_json_path, save_local_mindmap_json


def test_build_local_mindmap_json_path_uses_backend_local_output_dir():
    path = build_local_mindmap_json_path("job-123")

    assert path == (BASE_DIR / "local_output" / "mindmaps" / "job-123.json").resolve()


def test_save_local_mindmap_json_persists_graph(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCAL_MINDMAP_OUTPUT_DIR", str(tmp_path))
    get_settings.cache_clear()

    graph = {"meta": {"title": "Demo"}, "nodes": [{"id": "root", "label": "Demo", "type": "root"}], "edges": []}
    path = save_local_mindmap_json(job_id="job-abc", graph=graph)

    assert path == Path(tmp_path) / "job-abc.json"
    assert json.loads(path.read_text(encoding="utf-8")) == graph

    get_settings.cache_clear()
