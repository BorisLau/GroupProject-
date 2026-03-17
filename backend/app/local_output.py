import json
from pathlib import Path
from .config import get_settings


def build_local_mindmap_json_path(job_id: str) -> Path:
    settings = get_settings()
    return settings.local_mindmap_output_path / f"{job_id}.json"


def save_local_mindmap_json(*, job_id: str, graph: dict) -> Path:
    path = build_local_mindmap_json_path(job_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8")
    return path

