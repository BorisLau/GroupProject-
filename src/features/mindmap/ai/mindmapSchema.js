import { DEFAULT_META, NODE_TYPES, PRIORITY_LEVELS, RELATION_TYPES } from "./constants";

const MAX_LABEL_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

const safeString = (value, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
};

const clipText = (value, maxLength) => {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
};

const normalizeId = (value, fallbackPrefix, fallbackIndex) => {
  const candidate = safeString(value);
  if (candidate) {
    return candidate;
  }
  return `${fallbackPrefix}-${fallbackIndex}`;
};

const normalizeNodeType = (value) => {
  const candidate = safeString(value).toLowerCase();
  if (NODE_TYPES.includes(candidate)) {
    return candidate;
  }
  return "concept";
};

const normalizePriority = (value) => {
  const candidate = safeString(value).toLowerCase();
  if (PRIORITY_LEVELS.includes(candidate)) {
    return candidate;
  }
  return "medium";
};

const normalizeRelation = (value) => {
  const candidate = safeString(value).toLowerCase();
  if (RELATION_TYPES.includes(candidate)) {
    return candidate;
  }
  return "parent";
};

const toEdgeSignature = (edge) =>
  `${safeString(edge?.relation || "parent")}::${safeString(edge?.from)}::${safeString(edge?.to)}`;

const createNodeRecord = (rawNode, index, parentId = null) => {
  const id = normalizeId(rawNode?.id, "node", index + 1);
  const label = clipText(
    safeString(rawNode?.label || rawNode?.topic || rawNode?.name, "Untitled"),
    MAX_LABEL_LENGTH
  );
  const description = clipText(
    safeString(rawNode?.description || rawNode?.summary || ""),
    MAX_DESCRIPTION_LENGTH
  );

  return {
    id,
    label,
    description,
    type: normalizeNodeType(rawNode?.type),
    parentId: rawNode?.parentId ?? parentId,
    tags: Array.isArray(rawNode?.tags)
      ? rawNode.tags
          .map((item) => safeString(item))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    priority: normalizePriority(rawNode?.priority),
    group: safeString(rawNode?.group || ""),
    collapsed: Boolean(rawNode?.collapsed),
  };
};

const createEdgeRecord = (rawEdge, index) => {
  const id = normalizeId(rawEdge?.id, "edge", index + 1);
  return {
    id,
    from: safeString(rawEdge?.from || rawEdge?.source),
    to: safeString(rawEdge?.to || rawEdge?.target),
    relation: normalizeRelation(rawEdge?.relation || rawEdge?.type),
    label: clipText(safeString(rawEdge?.label || ""), MAX_LABEL_LENGTH),
  };
};

const flattenTree = (treeNode, nodes, edges, parentId = null) => {
  if (!treeNode || typeof treeNode !== "object") {
    return;
  }

  const nextNode = createNodeRecord(treeNode, nodes.length, parentId);
  nodes.push(nextNode);

  if (parentId) {
    edges.push({
      id: `edge-${edges.length + 1}`,
      from: parentId,
      to: nextNode.id,
      relation: "parent",
      label: "",
    });
  }

  const children = Array.isArray(treeNode.children) ? treeNode.children : [];
  children.forEach((child) => flattenTree(child, nodes, edges, nextNode.id));
};

const normalizeMeta = (rawMeta = {}) => {
  return {
    ...DEFAULT_META,
    title: safeString(rawMeta.title, DEFAULT_META.title),
    domain: safeString(rawMeta.domain, DEFAULT_META.domain),
    language: safeString(rawMeta.language, DEFAULT_META.language),
    generatedBy: safeString(rawMeta.generatedBy, DEFAULT_META.generatedBy),
    createdAt: safeString(rawMeta.createdAt, new Date().toISOString()),
  };
};

const dedupeById = (records) => {
  const map = new Map();
  records.forEach((record) => {
    if (!record.id) {
      return;
    }
    if (!map.has(record.id)) {
      map.set(record.id, record);
    }
  });
  return Array.from(map.values());
};

export const materializeParentEdges = (nodes = [], edges = []) => {
  const nextEdges = Array.isArray(edges) ? [...edges] : [];
  const knownSignatures = new Set(
    nextEdges
      .filter((edge) => edge?.from && edge?.to)
      .map((edge) => toEdgeSignature(edge))
  );

  (nodes || []).forEach((node) => {
    const childId = safeString(node?.id);
    const parentId = safeString(node?.parentId);
    if (!childId || !parentId || childId === parentId) {
      return;
    }

    const candidate = {
      id: `edge-parent-${parentId}-${childId}`,
      from: parentId,
      to: childId,
      relation: "parent",
      label: "",
    };
    const signature = toEdgeSignature(candidate);

    if (knownSignatures.has(signature)) {
      return;
    }

    nextEdges.push(candidate);
    knownSignatures.add(signature);
  });

  return nextEdges;
};

const buildEffectiveParentMap = (nodes = [], edges = []) => {
  const nodeIds = new Set((nodes || []).map((node) => safeString(node?.id)).filter(Boolean));
  const parentMap = new Map();

  (nodes || []).forEach((node) => {
    const nodeId = safeString(node?.id);
    const parentId = safeString(node?.parentId);
    if (!nodeId || !parentId || nodeId === parentId || !nodeIds.has(parentId)) {
      return;
    }
    parentMap.set(nodeId, parentId);
  });

  (edges || []).forEach((edge) => {
    if (safeString(edge?.relation || "parent") !== "parent") {
      return;
    }

    const fromId = safeString(edge?.from);
    const toId = safeString(edge?.to);
    if (!fromId || !toId || fromId === toId || parentMap.has(toId)) {
      return;
    }
    if (!nodeIds.has(fromId) || !nodeIds.has(toId)) {
      return;
    }
    parentMap.set(toId, fromId);
  });

  return parentMap;
};

const detectParentCycles = (parentMap) => {
  const errors = [];
  const visitState = new Map();

  const visit = (nodeId, trail = []) => {
    const state = visitState.get(nodeId);
    if (state === "done") {
      return;
    }

    const cycleStartIndex = trail.indexOf(nodeId);
    if (cycleStartIndex !== -1) {
      const cyclePath = [...trail.slice(cycleStartIndex), nodeId];
      errors.push(`parent 關係形成循環: ${cyclePath.join(" -> ")}`);
      return;
    }

    visitState.set(nodeId, "visiting");

    const parentId = parentMap.get(nodeId);
    if (parentId) {
      visit(parentId, [...trail, nodeId]);
    }

    visitState.set(nodeId, "done");
  };

  parentMap.forEach((_parentId, childId) => {
    visit(childId);
  });

  return errors;
};

export const normalizeMindmapGraph = (raw) => {
  const graph = raw || {};
  const nodes = [];
  const edges = [];

  if (Array.isArray(graph.nodes)) {
    graph.nodes.forEach((node, index) => {
      nodes.push(createNodeRecord(node, index, node?.parentId ?? null));
    });
  } else if (graph.root && typeof graph.root === "object") {
    flattenTree(graph.root, nodes, edges, null);
  } else if (graph.topic || graph.label || graph.children) {
    flattenTree(graph, nodes, edges, null);
  }

  if (Array.isArray(graph.edges)) {
    graph.edges.forEach((edge, index) => {
      edges.push(createEdgeRecord(edge, index));
    });
  }

  const normalizedNodes = dedupeById(nodes);
  const nodeIds = new Set(normalizedNodes.map((node) => node.id));
  const normalizedEdges = dedupeById(materializeParentEdges(normalizedNodes, edges)).filter((edge) => {
    return edge.from && edge.to && edge.from !== edge.to && nodeIds.has(edge.from) && nodeIds.has(edge.to);
  });

  if (normalizedNodes.length > 0 && !normalizedNodes.some((node) => node.type === "root")) {
    normalizedNodes[0] = { ...normalizedNodes[0], type: "root", parentId: null };
  }

  return {
    version: 1,
    meta: normalizeMeta(graph.meta),
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };
};

export const validateMindmapGraph = (graph) => {
  const errors = [];

  if (!graph || typeof graph !== "object") {
    return { ok: false, errors: ["graph 必須為 object"], value: null };
  }

  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    errors.push("nodes 不能為空");
  }

  const nodeIds = new Set();
  (graph.nodes || []).forEach((node) => {
    if (!node.id) {
      errors.push("node.id 缺失");
      return;
    }
    if (nodeIds.has(node.id)) {
      errors.push(`node.id 重複: ${node.id}`);
    }
    nodeIds.add(node.id);
    if (!node.label) {
      errors.push(`node.label 缺失: ${node.id}`);
    }

    const parentId = safeString(node.parentId);
    if (!parentId) {
      return;
    }

    if (parentId === node.id) {
      errors.push(`node.parentId 自循環禁止: ${node.id}`);
      return;
    }

    if (!nodeIds.has(parentId)) {
      errors.push(`node.parentId 指向不存在節點: ${node.id}`);
    }
  });

  (graph.edges || []).forEach((edge) => {
    if (!edge.from || !edge.to) {
      errors.push(`edge 端點缺失: ${edge.id || "unknown"}`);
      return;
    }
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(`edge 指向不存在節點: ${edge.id || "unknown"}`);
    }
    if (edge.from === edge.to) {
      errors.push(`edge 自循環禁止: ${edge.id || "unknown"}`);
    }
  });

  if (errors.length === 0) {
    const parentMap = buildEffectiveParentMap(graph.nodes || [], graph.edges || []);
    errors.push(...detectParentCycles(parentMap));
  }

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length === 0 ? graph : null,
  };
};
