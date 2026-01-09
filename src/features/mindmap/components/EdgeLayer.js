import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { calculatePathWithObstacles, generatePathThroughWaypoints } from "../utils/pathfinding";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function EdgeLayer({ edges, nodes, scale, offsetX, offsetY }) {
  // 獲取 port 在畫布上的位置
  const getPortPosition = (nodeId, port) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const nodeWidth = node.width || 100;
    const nodeHeight = node.height || 60;

    if (port === 'left') {
      return {
        x: node.x,
        y: node.y + nodeHeight / 2,
      };
    } else {
      // 右側 port
      return {
        x: node.x + nodeWidth,
        y: node.y + nodeHeight / 2,
      };
    }
  };

  // 獲取障礙物（所有節點除了起點和終點）
  const getObstacles = (fromNodeId, toNodeId) => {
    return nodes
      .filter((n) => n.id !== fromNodeId && n.id !== toNodeId)
      .map((n) => ({
        x: n.x,
        y: n.y,
        width: n.width || 100,
        height: n.height || 60,
      }));
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        style={styles.svg}
      >
        {edges.map((edge) => {
          // 獲取障礙物
          const obstacles = getObstacles(edge.fromNodeId, edge.toNodeId);

          // 獲取起點和終點 port 位置
          const startPos = getPortPosition(edge.fromNodeId, edge.fromPort);
          const endPos = getPortPosition(edge.toNodeId, edge.toPort);

          if (!startPos || !endPos) return null;

          const startCanvasX = startPos.x;
          const startCanvasY = startPos.y;
          const endCanvasX = endPos.x;
          const endCanvasY = endPos.y;

          // 計算避障路徑
          const waypoints = calculatePathWithObstacles(
            startCanvasX,
            startCanvasY,
            endCanvasX,
            endCanvasY,
            obstacles
          );

          // 轉換為屏幕坐標
          const screenWaypoints = waypoints.map((wp) => ({
            x: wp.x * scale + offsetX,
            y: wp.y * scale + offsetY,
          }));

          // 生成平滑路徑
          const path = generatePathThroughWaypoints(screenWaypoints);

          return (
            <Path
              key={edge.id}
              d={path}
              stroke="#333333"
              strokeWidth={2}
              fill="none"
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
