import { normalizeNodeType, normalizeRelationType } from "./classification";
import { getBestConnectionPorts } from "../canvasGraph";

export const toCanvasGraph = (graph) => {
  const nodeMap = new Map();
  const nodes = (graph?.nodes || []).map((node) => {
    const nextNode = {
      id: node.id,
      label: node.label,
      type: normalizeNodeType(node.type, node.label),
      text: node.label,
      data: {
        text: node.label,
        description: node.description || "",
        tags: node.tags || [],
        priority: node.priority || "medium",
        group: node.group || "",
      },
      x: Number.isFinite(node.x) ? node.x : 0,
      y: Number.isFinite(node.y) ? node.y : 0,
      width: Number.isFinite(node.width) ? node.width : 180,
      height: Number.isFinite(node.height) ? node.height : 72,
      parentId: node.parentId || null,
      collapsed: Boolean(node.collapsed),
    };
    nodeMap.set(nextNode.id, nextNode);
    return nextNode;
  });

  const edges = (graph?.edges || [])
    .map((edge, index) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) {
        return null;
      }
      const ports = getBestConnectionPorts(fromNode, toNode);
      return {
        id: edge.id || `edge-${index + 1}`,
        from: edge.from,
        to: edge.to,
        fromPort: ports.fromPort,
        toPort: ports.toPort,
        relation: normalizeRelationType(edge.relation, fromNode.type),
        label: edge.label || "",
      };
    })
    .filter(Boolean);

  return {
    version: 1,
    meta: graph?.meta || {},
    nodes,
    edges,
  };
};

export const fromCanvasGraph = (canvasGraph) => {
  const nodes = (canvasGraph?.nodes || []).map((node) => ({
    id: node.id,
    label: node.label || node.text || node.data?.text || "Untitled",
    description: node.data?.description || "",
    type: normalizeNodeType(node.type, node.label || node.text),
    parentId: node.parentId || null,
    tags: Array.isArray(node.data?.tags) ? node.data.tags : [],
    priority: node.data?.priority || "medium",
    group: node.data?.group || "",
    collapsed: Boolean(node.collapsed),
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  }));

  const edges = (canvasGraph?.edges || []).map((edge, index) => ({
    id: edge.id || `edge-${index + 1}`,
    from: edge.from || edge.fromNodeId,
    to: edge.to || edge.toNodeId,
    relation: normalizeRelationType(edge.relation || "parent"),
    label: edge.label || "",
  }));

  return {
    version: 1,
    meta: canvasGraph?.meta || {},
    nodes,
    edges,
  };
};
