from datetime import datetime, timezone
from typing import Any

NODE_TYPES = {
    "root",
    "concept",
    "question",
    "task",
    "decision",
    "resource",
    "risk",
    "note",
    "milestone",
    "group",
}

RELATION_TYPES = {"parent", "depends_on", "supports", "blocks", "references", "next"}
PRIORITY_LEVELS = {"low", "medium", "high"}

MAX_LABEL_LENGTH = 120
MAX_DESCRIPTION_LENGTH = 1000


def _safe_string(value: Any, fallback: str = "") -> str:
    if isinstance(value, str):
        text = value.strip()
        return text if text else fallback
    return fallback


def _clip(value: str, max_length: int) -> str:
    return value[:max_length] if len(value) > max_length else value


def _normalize_id(value: Any, prefix: str, index: int) -> str:
    candidate = _safe_string(value)
    return candidate or f"{prefix}-{index}"


def _normalize_node_type(value: Any) -> str:
    candidate = _safe_string(value).lower()
    return candidate if candidate in NODE_TYPES else "concept"


def _normalize_priority(value: Any) -> str:
    candidate = _safe_string(value).lower()
    return candidate if candidate in PRIORITY_LEVELS else "medium"


def _normalize_relation(value: Any) -> str:
    candidate = _safe_string(value).lower()
    return candidate if candidate in RELATION_TYPES else "parent"


def _dedupe_by_id(records: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for record in records:
        record_id = record.get("id")
        if record_id and record_id not in seen:
            seen[record_id] = record
    return list(seen.values())


def _slugify_label(value: str) -> str:
    lowered = value.strip().lower()
    chars = [char if char.isalnum() else "-" for char in lowered]
    slug = "".join(chars).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "group"


def _make_unique_node_id(existing_ids: set[str], label: str) -> str:
    base = f"group-{_slugify_label(label)}"
    candidate = base
    suffix = 2
    while candidate in existing_ids:
        candidate = f"{base}-{suffix}"
        suffix += 1
    existing_ids.add(candidate)
    return candidate


def _create_node(raw_node: dict, index: int, parent_id: str | None = None) -> dict:
    return {
        "id": _normalize_id(raw_node.get("id"), "node", index + 1),
        "label": _clip(
            _safe_string(raw_node.get("label") or raw_node.get("topic") or raw_node.get("name"), "Untitled"),
            MAX_LABEL_LENGTH,
        ),
        "description": _clip(
            _safe_string(raw_node.get("description") or raw_node.get("summary"), ""),
            MAX_DESCRIPTION_LENGTH,
        ),
        "type": _normalize_node_type(raw_node.get("type")),
        "parentId": raw_node.get("parentId") or parent_id,
        "tags": [
            _safe_string(item)
            for item in (raw_node.get("tags") if isinstance(raw_node.get("tags"), list) else [])
            if _safe_string(item)
        ][:8],
        "priority": _normalize_priority(raw_node.get("priority")),
        "group": _safe_string(raw_node.get("group"), ""),
        "collapsed": bool(raw_node.get("collapsed", False)),
    }


def _create_edge(raw_edge: dict, index: int) -> dict:
    return {
        "id": _normalize_id(raw_edge.get("id"), "edge", index + 1),
        "from": _safe_string(raw_edge.get("from") or raw_edge.get("source")),
        "to": _safe_string(raw_edge.get("to") or raw_edge.get("target")),
        "relation": _normalize_relation(raw_edge.get("relation") or raw_edge.get("type")),
        "label": _clip(_safe_string(raw_edge.get("label"), ""), MAX_LABEL_LENGTH),
    }


def _flatten_tree(tree_node: dict, nodes: list[dict], edges: list[dict], parent_id: str | None = None) -> None:
    if not isinstance(tree_node, dict):
        return

    node = _create_node(tree_node, len(nodes), parent_id=parent_id)
    nodes.append(node)

    if parent_id:
        edges.append(
            {
                "id": f"edge-{len(edges) + 1}",
                "from": parent_id,
                "to": node["id"],
                "relation": "parent",
                "label": "",
            }
        )

    children = tree_node.get("children") if isinstance(tree_node.get("children"), list) else []
    for child in children:
        _flatten_tree(child, nodes, edges, parent_id=node["id"])


def normalize_mindmap_graph(raw_graph: dict | None) -> dict:
    graph = raw_graph if isinstance(raw_graph, dict) else {}
    nodes: list[dict] = []
    edges: list[dict] = []

    if isinstance(graph.get("nodes"), list):
        for index, node in enumerate(graph["nodes"]):
            if isinstance(node, dict):
                nodes.append(_create_node(node, index, parent_id=node.get("parentId")))
    elif isinstance(graph.get("root"), dict):
        _flatten_tree(graph["root"], nodes, edges)
    elif any(key in graph for key in ("topic", "label", "children")):
        _flatten_tree(graph, nodes, edges)

    if isinstance(graph.get("edges"), list):
        for index, edge in enumerate(graph["edges"]):
            if isinstance(edge, dict):
                edges.append(_create_edge(edge, index))

    normalized_nodes = _dedupe_by_id(nodes)
    node_ids = {node["id"] for node in normalized_nodes}

    normalized_edges = [
        edge
        for edge in _dedupe_by_id(edges)
        if edge["from"] and edge["to"] and edge["from"] != edge["to"] and edge["from"] in node_ids and edge["to"] in node_ids
    ]

    if normalized_nodes and not any(node["type"] == "root" for node in normalized_nodes):
        normalized_nodes[0] = {**normalized_nodes[0], "type": "root", "parentId": None}

    return {
        "version": 1,
        "meta": {
            "title": _safe_string((graph.get("meta") or {}).get("title"), "Untitled Mindmap"),
            "domain": _safe_string((graph.get("meta") or {}).get("domain"), "general"),
            "language": _safe_string((graph.get("meta") or {}).get("language"), "zh-TW"),
            "generatedBy": _safe_string((graph.get("meta") or {}).get("generatedBy"), "openrouter"),
            "createdAt": datetime.now(timezone.utc).isoformat(),
        },
        "nodes": normalized_nodes,
        "edges": normalized_edges,
    }


def _materialize_group_layer(graph: dict) -> dict:
    nodes = graph.get("nodes") if isinstance(graph.get("nodes"), list) else []
    if not nodes:
        return graph

    root_node = next((node for node in nodes if node.get("type") == "root"), nodes[0])
    root_id = root_node.get("id")
    if not root_id:
        return graph

    node_map = {node["id"]: node for node in nodes if node.get("id")}
    parent_map: dict[str, str] = {}

    for node in nodes:
        node_id = _safe_string(node.get("id"))
        parent_id = _safe_string(node.get("parentId"))
        if node_id and parent_id and node_id != root_id:
            parent_map[node_id] = parent_id

    for edge in graph.get("edges", []):
        if _normalize_relation(edge.get("relation")) != "parent":
            continue
        child_id = _safe_string(edge.get("to"))
        parent_id = _safe_string(edge.get("from"))
        if child_id and parent_id and child_id != root_id:
            parent_map[child_id] = parent_id

    existing_ids = set(node_map.keys())
    existing_group_ids_by_label: dict[str, str] = {}
    for node in nodes:
        if node.get("type") != "group":
            continue
        if parent_map.get(node.get("id")) != root_id and node.get("parentId") != root_id:
            continue
        label = _safe_string(node.get("label"))
        if label:
            existing_group_ids_by_label[label.casefold()] = node["id"]

    grouped_members: dict[str, list[str]] = {}
    for node in nodes:
        node_id = _safe_string(node.get("id"))
        if not node_id or node_id == root_id or node.get("type") == "group":
            continue
        if parent_map.get(node_id) != root_id:
            continue
        group_label = _safe_string(node.get("group"))
        if not group_label:
            continue
        grouped_members.setdefault(group_label, []).append(node_id)

    next_nodes = list(nodes)
    changed = False
    for group_label, member_ids in grouped_members.items():
        normalized_label = group_label.casefold()
        group_id = existing_group_ids_by_label.get(normalized_label)

        if group_id is None and len(member_ids) < 2:
            continue

        if group_id is None:
            group_id = _make_unique_node_id(existing_ids, group_label)
            next_group_node = {
                "id": group_id,
                "label": group_label,
                "description": "",
                "type": "group",
                "parentId": root_id,
                "tags": [],
                "priority": "medium",
                "group": "",
                "collapsed": False,
            }
            next_nodes.append(next_group_node)
            node_map[group_id] = next_group_node
            parent_map[group_id] = root_id
            existing_group_ids_by_label[normalized_label] = group_id
            changed = True

        for member_id in member_ids:
            if parent_map.get(member_id) != group_id:
                parent_map[member_id] = group_id
                changed = True

    if not changed:
        return graph

    for node in next_nodes:
        node_id = _safe_string(node.get("id"))
        if node_id == root_id:
            node["parentId"] = None
            continue
        node["parentId"] = parent_map.get(node_id)

    non_parent_edges = [
        edge for edge in graph.get("edges", []) if _normalize_relation(edge.get("relation")) != "parent"
    ]
    rebuilt_parent_edges = [
        {
            "id": f"edge-parent-{parent_id}-{child_id}",
            "from": parent_id,
            "to": child_id,
            "relation": "parent",
            "label": "",
        }
        for child_id, parent_id in parent_map.items()
        if child_id in node_map and parent_id in node_map
    ]

    return {
        **graph,
        "nodes": next_nodes,
        "edges": _dedupe_by_id([*rebuilt_parent_edges, *non_parent_edges]),
    }


def validate_mindmap_graph(graph: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []

    if not isinstance(graph, dict):
        return False, ["graph must be object"]

    nodes = graph.get("nodes") if isinstance(graph.get("nodes"), list) else []
    edges = graph.get("edges") if isinstance(graph.get("edges"), list) else []

    if not nodes:
        errors.append("nodes cannot be empty")

    node_ids: set[str] = set()
    for node in nodes:
        node_id = _safe_string(node.get("id"))
        if not node_id:
            errors.append("node.id missing")
            continue
        if node_id in node_ids:
            errors.append(f"duplicate node.id: {node_id}")
        node_ids.add(node_id)

        if not _safe_string(node.get("label")):
            errors.append(f"node.label missing: {node_id}")

    for edge in edges:
        edge_id = _safe_string(edge.get("id"), "unknown")
        edge_from = _safe_string(edge.get("from"))
        edge_to = _safe_string(edge.get("to"))
        if not edge_from or not edge_to:
            errors.append(f"edge endpoint missing: {edge_id}")
            continue
        if edge_from == edge_to:
            errors.append(f"edge self loop is not allowed: {edge_id}")
        if edge_from not in node_ids or edge_to not in node_ids:
            errors.append(f"edge points to missing node: {edge_id}")

    return len(errors) == 0, errors


def finalize_generated_mindmap(
    raw_graph: dict,
    *,
    max_nodes: int = 50,
    title: str | None = None,
    language: str = "zh-TW",
) -> dict:
    graph = normalize_mindmap_graph(raw_graph)
    graph = _materialize_group_layer(graph)

    if len(graph["nodes"]) > max_nodes:
        kept_ids = {node["id"] for node in graph["nodes"][:max_nodes]}
        graph["nodes"] = graph["nodes"][:max_nodes]
        graph["edges"] = [
            edge for edge in graph["edges"] if edge["from"] in kept_ids and edge["to"] in kept_ids
        ]

    if title:
        graph["meta"]["title"] = title.strip() or graph["meta"]["title"]
    graph["meta"]["language"] = language

    ok, errors = validate_mindmap_graph(graph)
    if not ok:
        raise ValueError(f"Invalid mindmap graph: {'; '.join(errors)}")

    return graph
