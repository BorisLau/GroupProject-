import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import CanvasToolMenu from "../../../components/CanvasToolMenu";
import MindMapEdgeLayer from "../../../components/MindMapEdgeLayer";
import MobileSkiaCanvasLayer from "../../../components/MobileSkiaCanvasLayer";
import MindMapNodeLayer from "../../../components/MindMapNodeLayer";
import { useAuth } from "../../../contexts/AuthContext";
import useConversations from "../../../hooks/useConversations";
import useCanvasGraph from "../mindmap/useCanvasGraph";
import { borderRadius, colors, spacing, typography } from "../../../styles/theme";

const MIN_SCALE = 0.6;
const MAX_SCALE = 6;
const DOT_STEP = 24;
const DOT_RADIUS = 1.6;
const DOT_PERCENT = (DOT_RADIUS / DOT_STEP) * 100;
const WHEEL_ZOOM_SENSITIVITY = 0.0018;
const WHEEL_LINE_HEIGHT = 16;
const NEW_NODE_WIDTH = 200;
const NEW_NODE_HEIGHT = 84;
const CONNECTION_DOUBLE_TAP_DELAY_MS = 320;
const CONTEXT_MENU_WIDTH = 140;
const CONTEXT_MENU_HEIGHT = 52;
const CONTEXT_MENU_MARGIN = 12;
const DEVICE_PIXEL_RATIO = PixelRatio.get() || 1;

const clamp = (value, min, max) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

const modulo = (value, divisor) => {
  "worklet";
  return ((value % divisor) + divisor) % divisor;
};

const snapToPixel = (value) => {
  "worklet";
  return Math.round(value * DEVICE_PIXEL_RATIO) / DEVICE_PIXEL_RATIO;
};

const normalizeWheelDelta = (nativeEvent, viewportHeight) => {
  const deltaMode = Number.isFinite(nativeEvent?.deltaMode) ? nativeEvent.deltaMode : 0;
  const multiplier =
    deltaMode === 1
      ? WHEEL_LINE_HEIGHT
      : deltaMode === 2
        ? Math.max(1, viewportHeight)
        : 1;

  return {
    deltaX: (nativeEvent?.deltaX || 0) * multiplier,
    deltaY: (nativeEvent?.deltaY || 0) * multiplier,
  };
};

const getGestureFocalPoint = (event, viewportWidth, viewportHeight) => {
  "worklet";

  const fallbackX = viewportWidth > 0 ? viewportWidth / 2 : 0;
  const fallbackY = viewportHeight > 0 ? viewportHeight / 2 : 0;

  return {
    x: Number.isFinite(event?.focalX) ? event.focalX : fallbackX,
    y: Number.isFinite(event?.focalY) ? event.focalY : fallbackY,
  };
};

const getViewportCenterPoint = (viewportWidth, viewportHeight) => {
  "worklet";

  return {
    x: viewportWidth > 0 ? viewportWidth / 2 : 0,
    y: viewportHeight > 0 ? viewportHeight / 2 : 0,
  };
};

export default function CanvasScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const {
    loading: conversationsLoading,
    currentConversation,
    updateCurrentConversationGraph,
  } = useConversations();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isToolMenuExpanded, setIsToolMenuExpanded] = useState(false);
  const [dragModeEnabled, setDragModeEnabled] = useState(false);
  const [showConnectionPoints, setShowConnectionPoints] = useState(false);
  const [pendingConnectionNodeId, setPendingConnectionNodeId] = useState(null);
  const [webDeleteMenu, setWebDeleteMenu] = useState(null);
  const canvasContainerRef = useRef(null);
  const hasInitializedViewport = useRef(false);
  const webGestureStartScale = useRef(1);
  const webGestureOrigin = useRef({ x: 0, y: 0 });
  const lastConnectionTapRef = useRef({ nodeId: null, timestamp: 0 });
  const {
    graph,
    nodes,
    edges,
    updateNodeText,
    updateNodePosition,
    addNodeAtPosition,
    removeNode,
    removeLatestConnectionForNode,
    connectNodes,
  } = useCanvasGraph({
    graph: currentConversation?.mindmapGraph,
    setGraph: updateCurrentConversationGraph,
  });
  const graphTitle = currentConversation?.title || graph.meta?.title || "Canvas";

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  const pinchWorldX = useSharedValue(0);
  const pinchWorldY = useSharedValue(0);
  const activeDragNodeId = useSharedValue(null);
  const activeDragX = useSharedValue(0);
  const activeDragY = useSharedValue(0);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, router, session]);

  useEffect(() => {
    if (viewport.width <= 0 || viewport.height <= 0 || hasInitializedViewport.current) {
      return;
    }

    translateX.value = viewport.width / 2;
    translateY.value = viewport.height / 2;
    startTranslateX.value = viewport.width / 2;
    startTranslateY.value = viewport.height / 2;
    hasInitializedViewport.current = true;
  }, [startTranslateX, startTranslateY, translateX, translateY, viewport.height, viewport.width]);

  const getViewportCenter = useCallback(() => ({
    x: viewport.width > 0 ? viewport.width / 2 : 0,
    y: viewport.height > 0 ? viewport.height / 2 : 0,
  }), [viewport.height, viewport.width]);

  const panGesture = Gesture.Pan()
    .enabled(!showConnectionPoints)
    .averageTouches(true)
    .maxPointers(1)
    .onStart(() => {
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startTranslateX.value + event.translationX;
      translateY.value = startTranslateY.value + event.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      const focalPoint =
        Platform.OS === "web"
          ? getGestureFocalPoint(event, viewport.width, viewport.height)
          : getViewportCenterPoint(viewport.width, viewport.height);
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;

      pinchWorldX.value = (focalPoint.x - startTranslateX.value) / startScale.value;
      pinchWorldY.value = (focalPoint.y - startTranslateY.value) / startScale.value;
    })
    .onUpdate((event) => {
      if (!Number.isFinite(event.scale)) {
        return;
      }

      const focalPoint =
        Platform.OS === "web"
          ? getGestureFocalPoint(event, viewport.width, viewport.height)
          : getViewportCenterPoint(viewport.width, viewport.height);
      const nextScale = clamp(startScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      translateX.value = focalPoint.x - pinchWorldX.value * nextScale;
      translateY.value = focalPoint.y - pinchWorldY.value * nextScale;
      scale.value = nextScale;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const webGridAnimatedStyle = useAnimatedStyle(() => {
    const safeStep = snapToPixel(Math.max(4, DOT_STEP * scale.value));
    const offsetX = snapToPixel(modulo(translateX.value, safeStep));
    const offsetY = snapToPixel(modulo(translateY.value, safeStep));

    return {
      backgroundSize: `${safeStep}px ${safeStep}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
    };
  });

  const graphTranslateAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const graphScaleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleReset = useCallback(() => {
    const center = getViewportCenter();
    scale.value = withTiming(1, { duration: 180 });
    translateX.value = withTiming(center.x, { duration: 180 });
    translateY.value = withTiming(center.y, { duration: 180 });
  }, [getViewportCenter, scale, translateX, translateY]);

  const handleDemoNodeTextCommit = useCallback((nodeId, nextText) => {
    updateNodeText(nodeId, nextText);
  }, [updateNodeText]);

  const handleNodePositionChange = useCallback((nodeId, nextX, nextY) => {
    updateNodePosition(nodeId, nextX, nextY);
  }, [updateNodePosition]);

  const handleDeleteNodeConfirm = useCallback((nodeId) => {
    if (!nodeId) {
      return;
    }

    setPendingConnectionNodeId((prev) => (prev === nodeId ? null : prev));
    setWebDeleteMenu((prev) => (prev?.nodeId === nodeId ? null : prev));

    if (lastConnectionTapRef.current.nodeId === nodeId) {
      lastConnectionTapRef.current = { nodeId: null, timestamp: 0 };
    }

    removeNode(nodeId);
  }, [removeNode]);

  const handleDeleteNodeRequest = useCallback((nodeId) => {
    if (!nodeId) {
      return;
    }

    Alert.alert(
      "刪除節點",
      "是否刪除該節點？",
      [
        {
          text: "取消",
          style: "cancel",
        },
        {
          text: "刪除",
          style: "destructive",
          onPress: () => handleDeleteNodeConfirm(nodeId),
        },
      ]
    );
  }, [handleDeleteNodeConfirm]);

  const handleNodeContextMenuRequest = useCallback((nodeId, nativeEvent) => {
    if (Platform.OS !== "web" || !canvasContainerRef.current || !nodeId) {
      return;
    }

    const rect = canvasContainerRef.current.getBoundingClientRect?.();
    const clientX = Number.isFinite(nativeEvent?.clientX) ? nativeEvent.clientX : 0;
    const clientY = Number.isFinite(nativeEvent?.clientY) ? nativeEvent.clientY : 0;
    const localX = rect ? clientX - rect.left : clientX;
    const localY = rect ? clientY - rect.top : clientY;
    const clampedX = Math.min(
      Math.max(CONTEXT_MENU_MARGIN, localX),
      Math.max(CONTEXT_MENU_MARGIN, viewport.width - CONTEXT_MENU_WIDTH - CONTEXT_MENU_MARGIN)
    );
    const clampedY = Math.min(
      Math.max(CONTEXT_MENU_MARGIN, localY),
      Math.max(CONTEXT_MENU_MARGIN, viewport.height - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_MARGIN)
    );

    setWebDeleteMenu({
      nodeId,
      x: clampedX,
      y: clampedY,
    });
  }, [viewport.height, viewport.width]);

  const handleNodePress = useCallback((nodeId) => {
    if (!showConnectionPoints) {
      setWebDeleteMenu(null);
      return;
    }

    const now = Date.now();
    const isDoubleTapOnSameNode =
      lastConnectionTapRef.current.nodeId === nodeId &&
      now - lastConnectionTapRef.current.timestamp <= CONNECTION_DOUBLE_TAP_DELAY_MS;

    lastConnectionTapRef.current = { nodeId, timestamp: now };

    if (isDoubleTapOnSameNode) {
      setPendingConnectionNodeId(null);
      removeLatestConnectionForNode(nodeId);
      lastConnectionTapRef.current = { nodeId: null, timestamp: 0 };
      return;
    }

    setPendingConnectionNodeId((prev) => {
      if (!prev) {
        return nodeId;
      }

      if (prev === nodeId) {
        return nodeId;
      }

      connectNodes(prev, nodeId);
      return null;
    });
  }, [connectNodes, removeLatestConnectionForNode, showConnectionPoints]);

  const clearConnectionModeState = useCallback(() => {
    setPendingConnectionNodeId(null);
    lastConnectionTapRef.current = { nodeId: null, timestamp: 0 };
  }, []);

  const handleToggleDragMode = useCallback(() => {
    setDragModeEnabled((prev) => {
      const nextValue = !prev;

      if (nextValue) {
        setWebDeleteMenu(null);
        setShowConnectionPoints(false);
        clearConnectionModeState();
      }

      return nextValue;
    });
  }, [clearConnectionModeState]);

  const handleToggleConnectionMode = useCallback(() => {
    setShowConnectionPoints((prev) => {
      const nextValue = !prev;
      setWebDeleteMenu(null);
      if (nextValue) {
        setDragModeEnabled(false);
        clearConnectionModeState();
      }
      if (!nextValue) {
        clearConnectionModeState();
      }
      return nextValue;
    });
  }, [clearConnectionModeState]);

  const handleAddNode = useCallback(() => {
    setWebDeleteMenu(null);
    const currentScale = Math.max(scale.value, MIN_SCALE);
    const worldCenterX = (viewport.width / 2 - translateX.value) / currentScale;
    const worldCenterY = (viewport.height / 2 - translateY.value) / currentScale;

    addNodeAtPosition(
      worldCenterX - NEW_NODE_WIDTH / 2,
      worldCenterY - NEW_NODE_HEIGHT / 2
    );
  }, [addNodeAtPosition, scale, translateX, translateY, viewport.height, viewport.width]);

  const zoomAroundPoint = useCallback(
    (focalX, focalY, nextScale) => {
      const currentScale = scale.value;
      if (
        !Number.isFinite(currentScale) ||
        currentScale <= 0 ||
        !Number.isFinite(nextScale) ||
        nextScale <= 0
      ) {
        return;
      }

      const worldX = (focalX - translateX.value) / currentScale;
      const worldY = (focalY - translateY.value) / currentScale;

      translateX.value = focalX - worldX * nextScale;
      translateY.value = focalY - worldY * nextScale;
      scale.value = nextScale;
    },
    [scale, translateX, translateY]
  );

  const getWebFocalPoint = useCallback(
    (clientX, clientY) => {
      const rect = canvasContainerRef.current?.getBoundingClientRect?.();
      if (!rect) {
        return {
          x: viewport.width / 2,
          y: viewport.height / 2,
        };
      }

      const fallbackX = rect.width / 2;
      const fallbackY = rect.height / 2;
      const x = Number.isFinite(clientX) ? clientX - rect.left : fallbackX;
      const y = Number.isFinite(clientY) ? clientY - rect.top : fallbackY;

      return {
        x,
        y,
      };
    },
    [viewport.height, viewport.width]
  );

  const handleWheel = useCallback(
    (event) => {
      if (Platform.OS !== "web") {
        return;
      }

      const native = event?.nativeEvent;
      if (!native) {
        return;
      }

      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      const { deltaX, deltaY } = normalizeWheelDelta(native, viewport.height);
      const hasZoomModifier = !!native.ctrlKey || !!native.metaKey;
      const shouldPan = !!native.shiftKey && !hasZoomModifier;

      if (shouldPan) {
        translateX.value -= deltaX;
        translateY.value -= deltaY;
        return;
      }

      const currentScale = scale.value;
      const nextScale = clamp(
        currentScale * Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY),
        MIN_SCALE,
        MAX_SCALE
      );

      if (!Number.isFinite(nextScale) || nextScale === currentScale) {
        return;
      }

      const focalX = Number.isFinite(native.locationX) ? native.locationX : viewport.width / 2;
      const focalY = Number.isFinite(native.locationY) ? native.locationY : viewport.height / 2;
      zoomAroundPoint(focalX, focalY, nextScale);
    },
    [scale, translateX, translateY, viewport.height, viewport.width, zoomAroundPoint]
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      return undefined;
    }

    const element = canvasContainerRef.current;
    if (!element?.addEventListener) {
      return undefined;
    }

    const handleDomWheel = (event) => {
      const focalPoint = getWebFocalPoint(event.clientX, event.clientY);
      handleWheel({
        nativeEvent: {
          deltaMode: event.deltaMode,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          locationX: focalPoint.x,
          locationY: focalPoint.y,
        },
        preventDefault: () => event.preventDefault(),
      });
    };

    const handleGestureStart = (event) => {
      event.preventDefault();
      webGestureStartScale.current = scale.value;
      webGestureOrigin.current = getWebFocalPoint(event.clientX, event.clientY);
    };

    const handleGestureChange = (event) => {
      event.preventDefault();
      const nextScale = clamp(
        webGestureStartScale.current * (Number.isFinite(event.scale) ? event.scale : 1),
        MIN_SCALE,
        MAX_SCALE
      );
      zoomAroundPoint(webGestureOrigin.current.x, webGestureOrigin.current.y, nextScale);
    };

    const handleGestureEnd = (event) => {
      event.preventDefault();
    };

    element.addEventListener("wheel", handleDomWheel, { passive: false });
    element.addEventListener("gesturestart", handleGestureStart, { passive: false });
    element.addEventListener("gesturechange", handleGestureChange, { passive: false });
    element.addEventListener("gestureend", handleGestureEnd, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleDomWheel);
      element.removeEventListener("gesturestart", handleGestureStart);
      element.removeEventListener("gesturechange", handleGestureChange);
      element.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [getWebFocalPoint, handleWheel, scale, zoomAroundPoint]);

  if (authLoading || conversationsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{graphTitle}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
            <Text style={styles.primaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View
          ref={canvasContainerRef}
          style={styles.canvasContainer}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewport({ width, height });
          }}
        >
          <GestureDetector gesture={composedGesture}>
            <View style={StyleSheet.absoluteFill}>
              {Platform.OS === "web" ? (
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, styles.webGridLayer, webGridAnimatedStyle]}
                />
              ) : viewport.width > 0 && viewport.height > 0 ? (
                <MobileSkiaCanvasLayer
                  nodes={nodes}
                  edges={edges}
                  viewportWidth={viewport.width}
                  viewportHeight={viewport.height}
                  translateX={translateX}
                  translateY={translateY}
                  scale={scale}
                  activeDragNodeId={activeDragNodeId}
                  activeDragX={activeDragX}
                  activeDragY={activeDragY}
                />
              ) : null}

              <Animated.View pointerEvents="box-none" style={[styles.graphLayer, graphTranslateAnimatedStyle]}>
                <Animated.View pointerEvents="box-none" style={[styles.graphScaleLayer, graphScaleAnimatedStyle]}>
                  {Platform.OS === "web" ? <MindMapEdgeLayer nodes={nodes} edges={edges} /> : null}
                  <MindMapNodeLayer
                    nodes={nodes}
                    draggable={dragModeEnabled && !showConnectionPoints}
                    showHandles={showConnectionPoints}
                    connectMode={showConnectionPoints}
                    selectedNodeId={pendingConnectionNodeId}
                    onTextCommit={handleDemoNodeTextCommit}
                    onNodePress={handleNodePress}
                    onDeleteRequest={handleDeleteNodeRequest}
                    onContextMenuRequest={handleNodeContextMenuRequest}
                    onPositionChange={handleNodePositionChange}
                    viewportScale={scale}
                    canvasPanGesture={panGesture}
                    activeDragNodeId={activeDragNodeId}
                    activeDragX={activeDragX}
                    activeDragY={activeDragY}
                  />
                </Animated.View>
              </Animated.View>

              {nodes.length === 0 ? (
                <View pointerEvents="none" style={styles.emptyState}>
                </View>
              ) : null}
            </View>
          </GestureDetector>

          {Platform.OS === "web" && webDeleteMenu ? (
            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setWebDeleteMenu(null)}
              />
              <View
                style={[
                  styles.contextMenu,
                  {
                    left: webDeleteMenu.x,
                    top: webDeleteMenu.y,
                  },
                ]}
              >
                <Pressable
                  style={styles.contextMenuButton}
                  onPress={() => handleDeleteNodeConfirm(webDeleteMenu.nodeId)}
                >
                  <Text style={styles.contextMenuButtonText}>刪除節點</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <CanvasToolMenu
            expanded={isToolMenuExpanded}
            dragModeEnabled={dragModeEnabled}
            showConnectionPoints={showConnectionPoints}
            onToggleExpanded={() => setIsToolMenuExpanded((prev) => !prev)}
            onToggleDragMode={handleToggleDragMode}
            onAddNode={handleAddNode}
            onToggleConnectionPoints={handleToggleConnectionMode}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    ...typography.title,
    fontSize: 16,
  },
  primaryButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.disabled,
  },
  secondaryButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  canvasContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#f8fafd",
  },
  gridLayer: {
    position: "absolute",
    transformOrigin: [0, 0, 0],
  },
  webGridLayer: {
    backgroundColor: "#f8fafd",
    backgroundRepeat: "repeat",
    backgroundImage: `radial-gradient(circle at center, #cbd4e1 0 ${DOT_PERCENT}%, transparent ${DOT_PERCENT + 0.6}%)`,
    willChange: "background-position, background-size",
  },
  graphLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible",
  },
  graphScaleLayer: {
    ...StyleSheet.absoluteFillObject,
    transformOrigin: [0, 0, 0],
    overflow: "visible",
  },
  contextMenu: {
    position: "absolute",
    width: CONTEXT_MENU_WIDTH,
    minHeight: CONTEXT_MENU_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 30,
  },
  contextMenuButton: {
    minHeight: 40,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: "#fff3f1",
  },
  contextMenuButtonText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: "600",
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
});
