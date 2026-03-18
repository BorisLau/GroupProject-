const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 96;
const NODE_HORIZONTAL_GAP = 280;
const NODE_VERTICAL_GAP = 140;
const CONNECTION_PENALTY_MAJOR = 220;
const CONNECTION_PENALTY_MINOR = 36;
const CONNECTION_AXIS_PENALTY = 42;

export const DEFAULT_EDGE_STYLE = {
  stroke: "#9eb2d0",
  strokeWidth: 2,
};

export const PORT_SIDES = ["top", "right", "bottom", "left"];

export const createCanvasNode = ({
  id,
  text,
  x = 0,
  y = 0,
  width = DEFAULT_NODE_WIDTH,
  height = DEFAULT_NODE_HEIGHT,
  type = "concept",
  parentId = null,
}) => ({
  id,
  label: text,
  text,
  type,
  data: {
    text,
    description: "",
    tags: [],
    priority: "medium",
    group: "",
  },
  x,
  y,
  width,
  height,
  parentId,
  collapsed: false,
});

export const createEmptyCanvasGraph = ({ title = "Untitled Mindmap" } = {}) => ({
  version: 1,
  meta: {
    title,
  },
  nodes: [],
  edges: [],
});

export const createDemoCanvasGraph = () => {
  const rootNode = createCanvasNode({
    id: "node-root",
    text: "Double tap to edit",
    x: -(DEFAULT_NODE_WIDTH / 2),
    y: -(DEFAULT_NODE_HEIGHT / 2),
    type: "root",
  });

  const childNode = createCanvasNode({
    id: "node-child-1",
    text: "Use the tool menu to add nodes",
    x: NODE_HORIZONTAL_GAP - DEFAULT_NODE_WIDTH / 2,
    y: -(DEFAULT_NODE_HEIGHT / 2),
    width: 210,
    height: 80,
    parentId: rootNode.id,
  });

  return {
    version: 1,
    meta: {
      title: "Demo Mindmap",
    },
    nodes: [rootNode, childNode],
    edges: [
      {
        id: "edge-root-child-1",
        from: rootNode.id,
        to: childNode.id,
        fromPort: "right",
        toPort: "left",
        relation: "parent",
        label: "",
      },
    ],
  };
};

export const getOppositePort = (side) => {
  switch (side) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    default:
      return "left";
  }
};

export const getPortVector = (side) => {
  switch (side) {
    case "left":
      return { x: -1, y: 0 };
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
    case "right":
    default:
      return { x: 1, y: 0 };
  }
};

export const getNodePortPosition = (node, port = "right") => {
  "worklet";

  const width = Number.isFinite(node?.width) ? node.width : DEFAULT_NODE_WIDTH;
  const height = Number.isFinite(node?.height) ? node.height : DEFAULT_NODE_HEIGHT;
  const x = Number.isFinite(node?.x) ? node.x : 0;
  const y = Number.isFinite(node?.y) ? node.y : 0;

  switch (port) {
    case "left":
      return { x, y: y + height / 2 };
    case "top":
      return { x: x + width / 2, y };
    case "bottom":
      return { x: x + width / 2, y: y + height };
    case "right":
    default:
      return { x: x + width, y: y + height / 2 };
  }
};

const getConnectionScore = (fromPoint, toPoint, fromPort, toPort) => {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const distance = Math.hypot(dx, dy);
  const safeDistance = Math.max(distance, 1);
  const directionX = dx / safeDistance;
  const directionY = dy / safeDistance;
  const fromVector = getPortVector(fromPort);
  const toVector = getPortVector(toPort);
  const fromAlignment = fromVector.x * directionX + fromVector.y * directionY;
  const toAlignment = toVector.x * -directionX + toVector.y * -directionY;
  const prefersHorizontal = Math.abs(dx) >= Math.abs(dy);
  const fromMatchesAxis = prefersHorizontal ? fromVector.x !== 0 : fromVector.y !== 0;
  const toMatchesAxis = prefersHorizontal ? toVector.x !== 0 : toVector.y !== 0;

  let score = distance;

  score +=
    fromAlignment < 0
      ? (1 - fromAlignment) * CONNECTION_PENALTY_MAJOR
      : (1 - fromAlignment) * CONNECTION_PENALTY_MINOR;
  score +=
    toAlignment < 0
      ? (1 - toAlignment) * CONNECTION_PENALTY_MAJOR
      : (1 - toAlignment) * CONNECTION_PENALTY_MINOR;

  if (!fromMatchesAxis) {
    score += CONNECTION_AXIS_PENALTY;
  }

  if (!toMatchesAxis) {
    score += CONNECTION_AXIS_PENALTY;
  }

  return score;
};

export const getBestConnectionPorts = (fromNode, toNode) => {
  let bestCandidate = null;

  PORT_SIDES.forEach((fromPort) => {
    PORT_SIDES.forEach((toPort) => {
      const fromPoint = getNodePortPosition(fromNode, fromPort);
      const toPoint = getNodePortPosition(toNode, toPort);
      const score = getConnectionScore(fromPoint, toPoint, fromPort, toPort);

      if (!bestCandidate || score < bestCandidate.score) {
        bestCandidate = {
          fromPort,
          toPort,
          score,
        };
      }
    });
  });

  return bestCandidate || {
    fromPort: "right",
    toPort: "left",
  };
};

export const getNextNodePosition = (sourceNode, side, width = DEFAULT_NODE_WIDTH, height = DEFAULT_NODE_HEIGHT) => {
  const sourceWidth = Number.isFinite(sourceNode?.width) ? sourceNode.width : DEFAULT_NODE_WIDTH;
  const sourceHeight = Number.isFinite(sourceNode?.height) ? sourceNode.height : DEFAULT_NODE_HEIGHT;
  const sourceX = Number.isFinite(sourceNode?.x) ? sourceNode.x : 0;
  const sourceY = Number.isFinite(sourceNode?.y) ? sourceNode.y : 0;
  const sourceCenterX = sourceX + sourceWidth / 2;
  const sourceCenterY = sourceY + sourceHeight / 2;

  switch (side) {
    case "left":
      return {
        x: sourceCenterX - NODE_HORIZONTAL_GAP - width / 2,
        y: sourceCenterY - height / 2,
      };
    case "top":
      return {
        x: sourceCenterX - width / 2,
        y: sourceCenterY - NODE_VERTICAL_GAP - height / 2,
      };
    case "bottom":
      return {
        x: sourceCenterX - width / 2,
        y: sourceCenterY + NODE_VERTICAL_GAP - height / 2,
      };
    case "right":
    default:
      return {
        x: sourceCenterX + NODE_HORIZONTAL_GAP - width / 2,
        y: sourceCenterY - height / 2,
      };
  }
};
