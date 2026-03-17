import { useCallback, useState } from "react";
import {
  createCanvasNode,
  createDemoCanvasGraph,
  getBestConnectionPorts,
  getNextNodePosition,
  getOppositePort,
} from "./canvasGraph";

const NEW_NODE_WIDTH = 200;
const NEW_NODE_HEIGHT = 84;

const createNodeId = () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createEdgeId = () => `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function useCanvasGraph() {
  const [graph, setGraph] = useState(() => createDemoCanvasGraph());

  const updateNode = useCallback((nodeId, updater) => {
    setGraph((prev) => ({
      ...prev,
      nodes: (prev.nodes || []).map((node) =>
        node.id === nodeId ? updater(node) : node
      ),
    }));
  }, []);

  const updateNodeText = useCallback((nodeId, nextText) => {
    updateNode(nodeId, (node) => ({
      ...node,
      label: nextText,
      text: nextText,
      data: {
        ...(node.data || {}),
        text: nextText,
      },
    }));
  }, [updateNode]);

  const updateNodePosition = useCallback((nodeId, nextX, nextY) => {
    updateNode(nodeId, (node) => ({
      ...node,
      x: nextX,
      y: nextY,
    }));
  }, [updateNode]);

  const addNodeAtPosition = useCallback((nextX, nextY) => {
    setGraph((prev) => {
      const nextNodeId = createNodeId();
      const nextNodeText = "New Node";
      const nextNode = createCanvasNode({
        id: nextNodeId,
        text: nextNodeText,
        x: nextX,
        y: nextY,
        width: NEW_NODE_WIDTH,
        height: NEW_NODE_HEIGHT,
      });

      return {
        ...prev,
        nodes: [...(prev.nodes || []), nextNode],
      };
    });
  }, []);

  const removeNode = useCallback((nodeId) => {
    if (!nodeId) {
      return;
    }

    setGraph((prev) => {
      const nodes = prev.nodes || [];
      const edges = prev.edges || [];
      const nextNodes = nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => (
          node.parentId === nodeId
            ? {
                ...node,
                parentId: null,
              }
            : node
        ));
      const nextEdges = edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);

      if (nextNodes.length === nodes.length && nextEdges.length === edges.length) {
        return prev;
      }

      return {
        ...prev,
        nodes: nextNodes,
        edges: nextEdges,
      };
    });
  }, []);

  const removeLatestConnectionForNode = useCallback((nodeId) => {
    if (!nodeId) {
      return;
    }

    setGraph((prev) => {
      const edges = prev.edges || [];
      let removalIndex = -1;

      for (let index = edges.length - 1; index >= 0; index -= 1) {
        const edge = edges[index];
        if (edge.from === nodeId || edge.to === nodeId) {
          removalIndex = index;
          break;
        }
      }

      if (removalIndex < 0) {
        return prev;
      }

      return {
        ...prev,
        edges: edges.filter((_, index) => index !== removalIndex),
      };
    });
  }, []);

  const connectNodes = useCallback((fromNodeId, toNodeId) => {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      return;
    }

    setGraph((prev) => {
      const nodes = prev.nodes || [];
      const edges = prev.edges || [];
      const fromNode = nodes.find((node) => node.id === fromNodeId);
      const toNode = nodes.find((node) => node.id === toNodeId);

      if (!fromNode || !toNode) {
        return prev;
      }

      const alreadyConnected = edges.some(
        (edge) =>
          (edge.from === fromNodeId && edge.to === toNodeId) ||
          (edge.from === toNodeId && edge.to === fromNodeId)
      );

      if (alreadyConnected) {
        return prev;
      }

      const bestPorts = getBestConnectionPorts(fromNode, toNode);
      const nextEdge = {
        id: createEdgeId(),
        from: fromNodeId,
        to: toNodeId,
        fromPort: bestPorts.fromPort,
        toPort: bestPorts.toPort,
        relation: "custom",
        label: "",
      };

      return {
        ...prev,
        edges: [...edges, nextEdge],
      };
    });
  }, []);

  const addNodeFromHandle = useCallback((nodeId, side) => {
    setGraph((prev) => {
      const sourceNode = (prev.nodes || []).find((node) => node.id === nodeId);
      if (!sourceNode) {
        return prev;
      }

      const nextNodeId = createNodeId();
      const nextNodeText = "New Node";
      const nextPosition = getNextNodePosition(
        sourceNode,
        side,
        NEW_NODE_WIDTH,
        NEW_NODE_HEIGHT
      );

      const nextNode = createCanvasNode({
        id: nextNodeId,
        text: nextNodeText,
        x: nextPosition.x,
        y: nextPosition.y,
        width: NEW_NODE_WIDTH,
        height: NEW_NODE_HEIGHT,
        parentId: nodeId,
      });

      const nextEdge = {
        id: createEdgeId(),
        from: nodeId,
        to: nextNodeId,
        fromPort: side,
        toPort: getOppositePort(side),
        relation: "parent",
        label: "",
      };

      return {
        ...prev,
        nodes: [...(prev.nodes || []), nextNode],
        edges: [...(prev.edges || []), nextEdge],
      };
    });
  }, []);

  return {
    graph,
    nodes: graph.nodes || [],
    edges: graph.edges || [],
    setGraph,
    updateNodeText,
    updateNodePosition,
    addNodeAtPosition,
    removeNode,
    removeLatestConnectionForNode,
    connectNodes,
    addNodeFromHandle,
  };
}
