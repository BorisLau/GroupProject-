import pytest
from app.mindmap_schema import finalize_generated_mindmap


def test_finalize_generated_mindmap_forces_root_and_limits_nodes():
    raw = {
        "nodes": [
            {"id": "a", "label": "Main topic", "type": "concept"},
            {"id": "b", "label": "Sub topic", "type": "task", "parentId": "a"},
            {"id": "c", "label": "Extra", "type": "note", "parentId": "a"},
        ],
        "edges": [
            {"id": "e1", "from": "a", "to": "b", "relation": "parent"},
            {"id": "e2", "from": "a", "to": "c", "relation": "parent"},
        ],
    }

    graph = finalize_generated_mindmap(raw, max_nodes=2, title="Test", language="zh-TW")

    assert len(graph["nodes"]) == 2
    assert graph["nodes"][0]["type"] == "root"
    assert all(edge["to"] != "c" for edge in graph["edges"])


def test_finalize_generated_mindmap_raises_for_empty_graph():
    with pytest.raises(ValueError):
        finalize_generated_mindmap({}, max_nodes=10)
