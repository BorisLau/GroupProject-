import { getBestConnectionPorts, getNodePortPosition } from "./canvasGraph";

const EDGE_PADDING = 160;
const MIN_CONTROL_DISTANCE = 44;
const MAX_CONTROL_DISTANCE = 140;

const clamp = (value, min, max) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

const getPortVector = (port) => {
  "worklet";

  switch (port) {
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

const getControlPoint = (fromPoint, toPoint, port) => {
  "worklet";

  const direction = getPortVector(port);
  const primaryDistance =
    direction.x !== 0
      ? Math.abs(toPoint.x - fromPoint.x)
      : Math.abs(toPoint.y - fromPoint.y);
  const secondaryDistance =
    direction.x !== 0
      ? Math.abs(toPoint.y - fromPoint.y)
      : Math.abs(toPoint.x - fromPoint.x);

  const controlDistance = clamp(
    primaryDistance * 0.45 + secondaryDistance * 0.15,
    MIN_CONTROL_DISTANCE,
    MAX_CONTROL_DISTANCE
  );

  return {
    x: fromPoint.x + direction.x * controlDistance,
    y: fromPoint.y + direction.y * controlDistance,
  };
};

export const buildEdgeSegment = (edge, fromNode, toNode) => {
  "worklet";

  if (!edge || !fromNode || !toNode) {
    return null;
  }

  const bestPorts = getBestConnectionPorts(fromNode, toNode);
  const fromPort = bestPorts.fromPort;
  const toPort = bestPorts.toPort;
  const fromPoint = getNodePortPosition(fromNode, fromPort);
  const toPoint = getNodePortPosition(toNode, toPort);
  const controlPoint1 = getControlPoint(fromPoint, toPoint, fromPort);
  const controlPoint2 = getControlPoint(toPoint, fromPoint, toPort);

  return {
    id: edge.id,
    fromPoint,
    toPoint,
    controlPoint1,
    controlPoint2,
  };
};

export const buildEdgeSegments = (nodes = [], edges = []) => {
  const nodeMap = new Map();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  return edges.reduce((segments, edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) {
      return segments;
    }
    const segment = buildEdgeSegment(edge, fromNode, toNode);
    if (segment) {
      segments.push(segment);
    }

    return segments;
  }, []);
};

export const createEdgePath = (segment) => {
  "worklet";

  return (
    `M ${segment.fromPoint.x} ${segment.fromPoint.y} ` +
    `C ${segment.controlPoint1.x} ${segment.controlPoint1.y}, ` +
    `${segment.controlPoint2.x} ${segment.controlPoint2.y}, ` +
    `${segment.toPoint.x} ${segment.toPoint.y}`
  );
};

export const getEdgeLayout = (segments = []) => {
  if (segments.length === 0) {
    return null;
  }

  const allPoints = segments.flatMap((segment) => [
    segment.fromPoint,
    segment.toPoint,
    segment.controlPoint1,
    segment.controlPoint2,
  ]);

  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);
  const minX = Math.min(...xs) - EDGE_PADDING;
  const minY = Math.min(...ys) - EDGE_PADDING;
  const maxX = Math.max(...xs) + EDGE_PADDING;
  const maxY = Math.max(...ys) + EDGE_PADDING;

  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};
