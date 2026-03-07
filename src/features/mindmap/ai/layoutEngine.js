import {
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_HORIZONTAL_GAP,
  NODE_VERTICAL_GAP,
} from "./constants";

const toKey = (from, to) => `${from}__${to}`;

const estimateNodeWidth = (label) => {
  const text = String(label || "");
  const chars = Math.max(8, text.length);
  return Math.max(MIN_NODE_WIDTH, Math.min(360, chars * 8 + 48));
};

const estimateNodeHeight = (label) => {
  const text = String(label || "");
  const lines = Math.max(1, Math.ceil(text.length / 18));
  return Math.max(MIN_NODE_HEIGHT, Math.min(220, 48 + lines * 22));
};

const buildParentMap = (graph) => {
  const parentMap = new Map();

  graph.nodes.forEach((node) => {
    if (node.parentId) {
      parentMap.set(node.id, node.parentId);
    }
  });

  graph.edges.forEach((edge) => {
    if (edge.relation === "parent" && !parentMap.has(edge.to)) {
      parentMap.set(edge.to, edge.from);
    }
  });

  return parentMap;
};

const buildChildrenMap = (graph, parentMap) => {
  const childrenMap = new Map();
  graph.nodes.forEach((node) => {
    childrenMap.set(node.id, []);
  });

  parentMap.forEach((parentId, childId) => {
    if (childrenMap.has(parentId)) {
      childrenMap.get(parentId).push(childId);
    }
  });

  childrenMap.forEach((children, nodeId) => {
    children.sort((a, b) => {
      const nodeA = graph.nodes.find((node) => node.id === a);
      const nodeB = graph.nodes.find((node) => node.id === b);
      return String(nodeA?.label || "").localeCompare(String(nodeB?.label || ""));
    });
    childrenMap.set(nodeId, children);
  });

  return childrenMap;
};

const measureSubtree = (nodeId, childrenMap, cache, nodeHeightBase) => {
  if (cache.has(nodeId)) {
    return cache.get(nodeId);
  }

  const children = childrenMap.get(nodeId) || [];
  if (children.length === 0) {
    cache.set(nodeId, nodeHeightBase + NODE_VERTICAL_GAP);
    return cache.get(nodeId);
  }

  const total = children.reduce((sum, childId) => {
    return sum + measureSubtree(childId, childrenMap, cache, nodeHeightBase);
  }, 0);

  const measured = Math.max(nodeHeightBase + NODE_VERTICAL_GAP, total);
  cache.set(nodeId, measured);
  return measured;
};

const placeBranch = ({
  nodeId,
  depth,
  side,
  topY,
  centerX,
  childrenMap,
  subtreeSize,
  positions,
}) => {
  const totalHeight = subtreeSize.get(nodeId) || MIN_NODE_HEIGHT + NODE_VERTICAL_GAP;
  const x = centerX + side * depth * NODE_HORIZONTAL_GAP;
  const y = topY + totalHeight / 2;
  positions.set(nodeId, { x, y });

  const children = childrenMap.get(nodeId) || [];
  if (children.length === 0) {
    return;
  }

  const childHeights = children.map((childId) => subtreeSize.get(childId) || MIN_NODE_HEIGHT);
  const childrenTotal = childHeights.reduce((sum, value) => sum + value, 0);
  let cursorY = topY + (totalHeight - childrenTotal) / 2;

  children.forEach((childId, index) => {
    placeBranch({
      nodeId: childId,
      depth: depth + 1,
      side,
      topY: cursorY,
      centerX,
      childrenMap,
      subtreeSize,
      positions,
    });
    cursorY += childHeights[index];
  });
};

const placeOrphans = (nodes, positions, centerX, centerY) => {
  const orphans = nodes.filter((node) => !positions.has(node.id));
  let y = centerY + NODE_HORIZONTAL_GAP;
  orphans.forEach((node, index) => {
    positions.set(node.id, {
      x: centerX + (index % 2 === 0 ? 1 : -1) * NODE_HORIZONTAL_GAP,
      y,
    });
    y += MIN_NODE_HEIGHT + NODE_VERTICAL_GAP;
  });
};

export const layoutMindmapGraph = (graph, options = {}) => {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return graph;
  }

  const worldCenterX = options.worldCenterX ?? 10000;
  const worldCenterY = options.worldCenterY ?? 10000;
  const parentMap = buildParentMap(graph);
  const childrenMap = buildChildrenMap(graph, parentMap);
  const rootNode =
    graph.nodes.find((node) => node.type === "root") ||
    graph.nodes.find((node) => !parentMap.has(node.id)) ||
    graph.nodes[0];

  const firstLevel = childrenMap.get(rootNode.id) || [];
  const right = [];
  const left = [];
  firstLevel.forEach((nodeId, index) => {
    if (index % 2 === 0) {
      right.push(nodeId);
    } else {
      left.push(nodeId);
    }
  });

  const subtreeSize = new Map();
  const baseHeight = MIN_NODE_HEIGHT + NODE_VERTICAL_GAP;
  graph.nodes.forEach((node) => measureSubtree(node.id, childrenMap, subtreeSize, baseHeight));

  const positions = new Map();
  positions.set(rootNode.id, { x: worldCenterX, y: worldCenterY });

  const rightTotal = right.reduce((sum, nodeId) => sum + (subtreeSize.get(nodeId) || baseHeight), 0);
  const leftTotal = left.reduce((sum, nodeId) => sum + (subtreeSize.get(nodeId) || baseHeight), 0);

  let rightCursor = worldCenterY - rightTotal / 2;
  right.forEach((nodeId) => {
    placeBranch({
      nodeId,
      depth: 1,
      side: 1,
      topY: rightCursor,
      centerX: worldCenterX,
      childrenMap,
      subtreeSize,
      positions,
    });
    rightCursor += subtreeSize.get(nodeId) || baseHeight;
  });

  let leftCursor = worldCenterY - leftTotal / 2;
  left.forEach((nodeId) => {
    placeBranch({
      nodeId,
      depth: 1,
      side: -1,
      topY: leftCursor,
      centerX: worldCenterX,
      childrenMap,
      subtreeSize,
      positions,
    });
    leftCursor += subtreeSize.get(nodeId) || baseHeight;
  });

  placeOrphans(graph.nodes, positions, worldCenterX, worldCenterY);

  const nodes = graph.nodes.map((node) => {
    const position = positions.get(node.id) || { x: worldCenterX, y: worldCenterY };
    const width = estimateNodeWidth(node.label);
    const height = estimateNodeHeight(node.label);

    return {
      ...node,
      width,
      height,
      x: position.x - width / 2,
      y: position.y - height / 2,
    };
  });

  const edgeIds = new Set();
  const edges = [];
  graph.edges.forEach((edge) => {
    const key = toKey(edge.from, edge.to);
    if (edgeIds.has(key)) {
      return;
    }
    edgeIds.add(key);
    edges.push(edge);
  });

  return {
    ...graph,
    nodes,
    edges,
  };
};

