import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Canvas, Fill, Group, Path, Points } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { colors } from "../styles/theme";
import { buildEdgeSegment, createEdgePath } from "../src/features/mindmap/edgeGeometry";

const DOT_STEP = 24;
const DOT_DIAMETER = 3.2;
const GRID_OVERSCAN = 2;

const modulo = (value, divisor) => {
  "worklet";
  return ((value % divisor) + divisor) % divisor;
};

function MobileSkiaEdgePath({
  edge,
  fromNode,
  toNode,
  activeDragNodeId,
  activeDragX,
  activeDragY,
}) {
  const path = useDerivedValue(() => {
    const isDraggingFromNode = activeDragNodeId.value === fromNode.id;
    const isDraggingToNode = activeDragNodeId.value === toNode.id;
    const liveFromNode = isDraggingFromNode
      ? {
          ...fromNode,
          x: activeDragX.value,
          y: activeDragY.value,
        }
      : fromNode;
    const liveToNode = isDraggingToNode
      ? {
          ...toNode,
          x: activeDragX.value,
          y: activeDragY.value,
        }
      : toNode;
    const segment = buildEdgeSegment(edge, liveFromNode, liveToNode);

    return segment ? createEdgePath(segment) : "";
  }, [edge, fromNode, toNode]);

  return (
    <Path
      path={path}
      color={colors.primary}
      opacity={0.4}
      style="stroke"
      strokeCap="round"
      strokeJoin="round"
      strokeWidth={3}
    />
  );
}

export default function MobileSkiaCanvasLayer({
  nodes = [],
  edges = [],
  viewportWidth = 0,
  viewportHeight = 0,
  translateX,
  translateY,
  scale,
  activeDragNodeId,
  activeDragX,
  activeDragY,
}) {
  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [nodes]);

  const graphTranslateTransform = useDerivedValue(() => ([
    { translateX: translateX.value },
    { translateY: translateY.value },
  ]));

  const graphScaleTransform = useDerivedValue(() => ([
    { scale: scale.value },
  ]));

  const gridPoints = useDerivedValue(() => {
    const width = Math.max(1, viewportWidth);
    const height = Math.max(1, viewportHeight);
    const step = Math.max(8, DOT_STEP * scale.value);
    const startX = modulo(translateX.value, step) - step;
    const startY = modulo(translateY.value, step) - step;
    const columns = Math.ceil(width / step) + GRID_OVERSCAN * 2 + 1;
    const rows = Math.ceil(height / step) + GRID_OVERSCAN * 2 + 1;
    const points = [];

    for (let row = 0; row < rows; row += 1) {
      const y = startY + (row - GRID_OVERSCAN) * step;

      for (let column = 0; column < columns; column += 1) {
        points.push({
          x: startX + (column - GRID_OVERSCAN) * step,
          y,
        });
      }
    }

    return points;
  }, [viewportHeight, viewportWidth]);

  const gridStrokeWidth = useDerivedValue(() => Math.max(1.2, DOT_DIAMETER * scale.value));

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill color="#f8fafd" />
      <Points
        mode="points"
        points={gridPoints}
        color="#cbd4e1"
        style="stroke"
        strokeCap="round"
        strokeWidth={gridStrokeWidth}
      />

      <Group transform={graphTranslateTransform}>
        <Group transform={graphScaleTransform}>
          {edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);

            if (!fromNode || !toNode) {
              return null;
            }

            return (
              <MobileSkiaEdgePath
                key={edge.id}
                edge={edge}
                fromNode={fromNode}
                toNode={toNode}
                activeDragNodeId={activeDragNodeId}
                activeDragX={activeDragX}
                activeDragY={activeDragY}
              />
            );
          })}
        </Group>
      </Group>
    </Canvas>
  );
}
