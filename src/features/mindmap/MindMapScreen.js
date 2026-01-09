import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import Node from "./components/Node";
import EdgeLayer from "./components/EdgeLayer";
import { clamp } from "./utils/coordinates";
import { colors } from "../../../styles/theme";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

export default function MindMapScreen() {
  const router = useRouter();

  // Canvas transform state
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);

  // Mind map data
  const [nodes, setNodes] = useState([
    { id: "1", x: 150, y: 200, text: "Root Node", width: 120, height: 80 },
    { id: "2", x: 400, y: 150, text: "Child 1", width: 100, height: 60 },
    { id: "3", x: 400, y: 300, text: "Child 2", width: 100, height: 60 },
  ]);

  const [edges, setEdges] = useState([
    { id: "e1", fromNodeId: "1", fromPort: "right", toNodeId: "2", toPort: "left" },
    { id: "e2", fromNodeId: "1", fromPort: "right", toNodeId: "3", toPort: "left" },
  ]);

  // Connection mode: track which port was clicked first
  const [connectingPort, setConnectingPort] = useState(null); // { nodeId, port }

  // Pan gesture (one finger)
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((event) => {
      offsetX.value = savedOffsetX.value + event.translationX;
      offsetY.value = savedOffsetY.value + event.translationY;
    });

  // Pinch gesture (two fingers)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((event) => {
      const newScale = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      scale.value = newScale;

      // Scale around focal point
      const deltaScale = newScale / savedScale.value;
      offsetX.value = event.focalX - (event.focalX - savedOffsetX.value) * deltaScale;
      offsetY.value = event.focalY - (event.focalY - savedOffsetY.value) * deltaScale;
    });

  // Combine gestures
  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture);

  const canvasStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withSpring(offsetX.value, { damping: 20 }) },
        { translateY: withSpring(offsetY.value, { damping: 20 }) },
        { scale: withSpring(scale.value, { damping: 20 }) },
      ],
    };
  });

  // Node operations
  const handleNodeMove = useCallback((nodeId, newX, newY) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, x: newX, y: newY } : node
      )
    );
  }, []);

  const handleNodeDelete = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) =>
      prev.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId)
    );
    // Clear selection if deleted node was selected
    setConnectingPort((prev) => prev?.nodeId === nodeId ? null : prev);
  }, []);

  const handleTextChange = useCallback((nodeId, newText) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId) {
          // Calculate new dimensions based on text length
          const charCount = newText.length;
          const newWidth = Math.max(100, Math.min(charCount * 8, 300));
          const newHeight = Math.max(60, Math.ceil(charCount / 20) * 30);
          return { ...node, text: newText, width: newWidth, height: newHeight };
        }
        return node;
      })
    );
  }, []);

  // Port click for creating connections
  const handlePortClick = useCallback((nodeId, port) => {
    if (connectingPort === null) {
      // First port selected
      setConnectingPort({ nodeId, port });
    } else if (connectingPort.nodeId === nodeId && connectingPort.port === port) {
      // Clicked same port - deselect
      setConnectingPort(null);
    } else {
      // Second port selected - create edge
      const edgeExists = edges.some(
        (edge) =>
          (edge.fromNodeId === connectingPort.nodeId && edge.fromPort === connectingPort.port &&
           edge.toNodeId === nodeId && edge.toPort === port) ||
          (edge.fromNodeId === nodeId && edge.fromPort === port &&
           edge.toNodeId === connectingPort.nodeId && edge.toPort === connectingPort.port)
      );

      if (!edgeExists) {
        const newEdge = {
          id: `e${Date.now()}`,
          fromNodeId: connectingPort.nodeId,
          fromPort: connectingPort.port,
          toNodeId: nodeId,
          toPort: port,
        };
        setEdges((prev) => [...prev, newEdge]);
      }

      // Clear selection
      setConnectingPort(null);
    }
  }, [connectingPort, edges]);

  // Add new node
  const handleAddNode = () => {
    const newNode = {
      id: `${Date.now()}`,
      x: 200 - offsetX.value / scale.value,
      y: 200 - offsetY.value / scale.value,
      text: "New Node",
      width: 100,
      height: 60,
    };
    setNodes((prev) => [...prev, newNode]);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mind Map</Text>
          <View style={styles.headerRight}>
            {connectingPort && (
              <TouchableOpacity
                onPress={() => setConnectingPort(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>取消連線</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleAddNode} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Node</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Canvas */}
        <View style={styles.canvasContainer}>
          <GestureDetector gesture={composedGestures}>
            <Animated.View style={[styles.canvas, canvasStyle]}>
              {/* Edge Layer (behind nodes) */}
              <EdgeLayer
                edges={edges}
                nodes={nodes}
                scale={scale.value}
                offsetX={offsetX.value}
                offsetY={offsetY.value}
              />

              {/* Nodes */}
              {nodes.map((node) => (
                <Node
                  key={node.id}
                  node={node}
                  scale={scale.value}
                  onMove={handleNodeMove}
                  onDelete={handleNodeDelete}
                  onTextChange={handleTextChange}
                  onPortClick={handlePortClick}
                />
              ))}
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            • 雙指捏合縮放 • 單指拖動畫布 • 長按拖動節點
          </Text>
          <Text style={styles.instructionText}>
            • 點擊節點編輯 • 點擊圓點創建連線 • 長按刪除
          </Text>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.error,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textOnPrimary,
    fontWeight: "600",
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: colors.textOnPrimary,
    fontWeight: "600",
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  canvas: {
    flex: 1,
    position: "relative",
  },
  instructions: {
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  instructionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
