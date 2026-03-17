import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../styles/theme";
import {
  buildEdgeSegments,
  createEdgePath,
  getEdgeLayout,
} from "../src/features/mindmap/edgeGeometry";

export default function MindMapEdgeLayer({ nodes = [], edges = [] }) {
  const edgeLayout = useMemo(() => {
    const segments = buildEdgeSegments(nodes, edges);
    const layout = getEdgeLayout(segments);
    if (!layout) {
      return null;
    }

    return {
      ...layout,
      segments,
    };
  }, [edges, nodes]);

  if (!edgeLayout) {
    return null;
  }

  return (
    <Svg
      pointerEvents="none"
      style={[
        styles.edgeCanvas,
        {
          left: edgeLayout.left,
          top: edgeLayout.top,
          width: edgeLayout.width,
          height: edgeLayout.height,
        },
      ]}
      viewBox={`0 0 ${edgeLayout.width} ${edgeLayout.height}`}
    >
      {edgeLayout.segments.map((segment) => {
        const translatedSegment = {
          ...segment,
          fromPoint: {
            x: segment.fromPoint.x - edgeLayout.left,
            y: segment.fromPoint.y - edgeLayout.top,
          },
          toPoint: {
            x: segment.toPoint.x - edgeLayout.left,
            y: segment.toPoint.y - edgeLayout.top,
          },
          controlPoint1: {
            x: segment.controlPoint1.x - edgeLayout.left,
            y: segment.controlPoint1.y - edgeLayout.top,
          },
          controlPoint2: {
            x: segment.controlPoint2.x - edgeLayout.left,
            y: segment.controlPoint2.y - edgeLayout.top,
          },
        };

        return (
          <Path
            key={segment.id}
            d={createEdgePath(translatedSegment)}
            fill="none"
            stroke={colors.primary}
            strokeOpacity={0.4}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  edgeCanvas: {
    position: "absolute",
    overflow: "visible",
  },
});
