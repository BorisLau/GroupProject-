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


def test_finalize_generated_mindmap_materializes_group_layer_from_group_field():
    raw = {
        "nodes": [
            {"id": "root", "label": "智慧學習平台", "type": "root"},
            {"id": "a", "label": "課程管理", "type": "concept", "parentId": "root", "group": "核心功能"},
            {"id": "b", "label": "學習計畫", "type": "task", "parentId": "root", "group": "核心功能"},
            {"id": "c", "label": "數據分析", "type": "concept", "parentId": "root", "group": "分析能力"},
        ],
        "edges": [
            {"id": "e1", "from": "root", "to": "a", "relation": "parent"},
            {"id": "e2", "from": "root", "to": "b", "relation": "parent"},
            {"id": "e3", "from": "root", "to": "c", "relation": "parent"},
        ],
    }

    graph = finalize_generated_mindmap(raw, max_nodes=10, title="Test", language="zh-TW")

    group_node = next(node for node in graph["nodes"] if node["type"] == "group" and node["label"] == "核心功能")
    assert group_node["parentId"] == "root"
    assert next(node for node in graph["nodes"] if node["id"] == "a")["parentId"] == group_node["id"]
    assert next(node for node in graph["nodes"] if node["id"] == "b")["parentId"] == group_node["id"]
    assert next(node for node in graph["nodes"] if node["id"] == "c")["parentId"] == "root"
    assert any(
        edge["relation"] == "parent" and edge["from"] == "root" and edge["to"] == group_node["id"]
        for edge in graph["edges"]
    )
