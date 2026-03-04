import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from "react-native-svg";
import { useAuth } from "../../../contexts/AuthContext";
import { borderRadius, colors, spacing, typography } from "../../../styles/theme";

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const GRID_WORLD_SIZE = 4096;
const HALF_GRID_WORLD_SIZE = GRID_WORLD_SIZE / 2;
const GUIDE_AXIS_COLOR = "#8798b6";
const GUIDE_MARKER_DISTANCE = 320;
const GUIDE_MARKER_RADIUS = 28;

const MAX_PAN_OFFSET = GRID_WORLD_SIZE * 0.6;
const INITIAL_VIEWPORT = { x: 0, y: 0, zoom: 1 };

export default function CanvasScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const hasInitializedViewport = useRef(false);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, router, session]);

  const scale = useSharedValue(INITIAL_VIEWPORT.zoom);
  const offsetX = useSharedValue(INITIAL_VIEWPORT.x);
  const offsetY = useSharedValue(INITIAL_VIEWPORT.y);
  const startScale = useSharedValue(INITIAL_VIEWPORT.zoom);
  const startOffsetX = useSharedValue(INITIAL_VIEWPORT.x);
  const startOffsetY = useSharedValue(INITIAL_VIEWPORT.y);

  const getInitialOffsets = useCallback(() => {
    return {
      x: viewportSize.width > 0 ? viewportSize.width / 2 : 0,
      y: viewportSize.height > 0 ? viewportSize.height / 2 : 0,
    };
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height || hasInitializedViewport.current) {
      return;
    }

    const nextOffsets = getInitialOffsets();
    offsetX.value = nextOffsets.x;
    offsetY.value = nextOffsets.y;
    startOffsetX.value = nextOffsets.x;
    startOffsetY.value = nextOffsets.y;
    hasInitializedViewport.current = true;
  }, [
    getInitialOffsets,
    offsetX,
    offsetY,
    startOffsetX,
    startOffsetY,
    viewportSize.height,
    viewportSize.width,
  ]);

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      startOffsetX.value = offsetX.value;
      startOffsetY.value = offsetY.value;
    })
    .onUpdate((event) => {
      if (!Number.isFinite(event.translationX) || !Number.isFinite(event.translationY)) {
        return;
      }

      const nextOffsetX = startOffsetX.value + event.translationX;
      const nextOffsetY = startOffsetY.value + event.translationY;

      if (!Number.isFinite(nextOffsetX) || !Number.isFinite(nextOffsetY)) {
        return;
      }

      offsetX.value = Math.max(-MAX_PAN_OFFSET, Math.min(MAX_PAN_OFFSET, nextOffsetX));
      offsetY.value = Math.max(-MAX_PAN_OFFSET, Math.min(MAX_PAN_OFFSET, nextOffsetY));
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      startOffsetX.value = offsetX.value;
      startOffsetY.value = offsetY.value;
    })
    .onUpdate((event) => {
      if (
        !Number.isFinite(event.scale) ||
        !Number.isFinite(event.focalX) ||
        !Number.isFinite(event.focalY)
      ) {
        return;
      }

      const anchorX = event.focalX;
      const anchorY = event.focalY;

      const safeStartScale =
        Number.isFinite(startScale.value) && startScale.value > 0
          ? startScale.value
          : 1;
      const rawScale = safeStartScale * event.scale;

      if (!Number.isFinite(rawScale)) {
        return;
      }

      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale));
      const deltaScale = nextScale / safeStartScale;

      if (!Number.isFinite(deltaScale)) {
        return;
      }

      const nextOffsetX =
        anchorX - (anchorX - startOffsetX.value) * deltaScale;
      const nextOffsetY =
        anchorY - (anchorY - startOffsetY.value) * deltaScale;

      if (!Number.isFinite(nextOffsetX) || !Number.isFinite(nextOffsetY)) {
        return;
      }

      offsetX.value = Math.max(-MAX_PAN_OFFSET, Math.min(MAX_PAN_OFFSET, nextOffsetX));
      offsetY.value = Math.max(-MAX_PAN_OFFSET, Math.min(MAX_PAN_OFFSET, nextOffsetY));
      scale.value = nextScale;
    })
    .onEnd(() => {
      if (!Number.isFinite(scale.value)) {
        scale.value = 1;
      }
      if (!Number.isFinite(offsetX.value)) {
        offsetX.value = 0;
      }
      if (!Number.isFinite(offsetY.value)) {
        offsetY.value = 0;
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const worldStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value },
        { scale: scale.value },
      ],
    };
  });

  const handleResetView = useCallback(() => {
    const nextOffsets = getInitialOffsets();
    scale.value = withTiming(INITIAL_VIEWPORT.zoom, { duration: 180 });
    offsetX.value = withTiming(nextOffsets.x, { duration: 180 });
    offsetY.value = withTiming(nextOffsets.y, { duration: 180 });
  }, [getInitialOffsets, offsetX, offsetY, scale]);

  if (authLoading) {
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
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace("/")}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Workflow Canvas</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleResetView}>
            <Text style={styles.primaryButtonText}>Reset View</Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.canvasContainer}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewportSize({ width, height });
          }}
        >
          <GestureDetector gesture={composedGesture}>
            <View style={StyleSheet.absoluteFill}>
              <Animated.View style={[styles.worldLayer, worldStyle]}>
                <View style={styles.gridOrigin}>
                  <Svg width={GRID_WORLD_SIZE} height={GRID_WORLD_SIZE}>
                    <Defs>
                      <LinearGradient id="canvasGuideBg" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#f7faff" stopOpacity="1" />
                        <Stop offset="1" stopColor="#e6eefb" stopOpacity="1" />
                      </LinearGradient>
                    </Defs>
                    <Rect
                      x={0}
                      y={0}
                      width={GRID_WORLD_SIZE}
                      height={GRID_WORLD_SIZE}
                      fill="url(#canvasGuideBg)"
                    />
                    <Rect
                      x={HALF_GRID_WORLD_SIZE - 520}
                      y={HALF_GRID_WORLD_SIZE - 520}
                      width={1040}
                      height={1040}
                      fill="#edf4ff"
                      stroke="#9eb2d0"
                      strokeWidth={8}
                    />
                    <Line
                      x1={0}
                      y1={HALF_GRID_WORLD_SIZE}
                      x2={GRID_WORLD_SIZE}
                      y2={HALF_GRID_WORLD_SIZE}
                      stroke={GUIDE_AXIS_COLOR}
                      strokeWidth={6}
                      strokeOpacity={0.72}
                    />
                    <Line
                      x1={HALF_GRID_WORLD_SIZE}
                      y1={0}
                      x2={HALF_GRID_WORLD_SIZE}
                      y2={GRID_WORLD_SIZE}
                      stroke={GUIDE_AXIS_COLOR}
                      strokeWidth={6}
                      strokeOpacity={0.72}
                    />
                    <Circle
                      cx={HALF_GRID_WORLD_SIZE}
                      cy={HALF_GRID_WORLD_SIZE}
                      r={52}
                      fill="#6e84a8"
                      fillOpacity={0.9}
                    />
                    <Circle
                      cx={HALF_GRID_WORLD_SIZE - GUIDE_MARKER_DISTANCE}
                      cy={HALF_GRID_WORLD_SIZE}
                      r={GUIDE_MARKER_RADIUS}
                      fill="#90a5c5"
                    />
                    <Circle
                      cx={HALF_GRID_WORLD_SIZE + GUIDE_MARKER_DISTANCE}
                      cy={HALF_GRID_WORLD_SIZE}
                      r={GUIDE_MARKER_RADIUS}
                      fill="#90a5c5"
                    />
                    <Circle
                      cx={HALF_GRID_WORLD_SIZE}
                      cy={HALF_GRID_WORLD_SIZE - GUIDE_MARKER_DISTANCE}
                      r={GUIDE_MARKER_RADIUS}
                      fill="#90a5c5"
                    />
                    <Circle
                      cx={HALF_GRID_WORLD_SIZE}
                      cy={HALF_GRID_WORLD_SIZE + GUIDE_MARKER_DISTANCE}
                      r={GUIDE_MARKER_RADIUS}
                      fill="#90a5c5"
                    />
                  </Svg>
                </View>
              </Animated.View>
            </View>
          </GestureDetector>

          <View style={styles.hud}>
            <Text style={styles.hudTitle}>Canvas MVP</Text>
            <Text style={styles.hudText}>Pan with one finger, pinch with two fingers.</Text>
            <Text style={styles.hudText}>
              nodes: 0 | edges: 0
            </Text>
          </View>
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
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  worldLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridOrigin: {
    position: "absolute",
    left: -HALF_GRID_WORLD_SIZE,
    top: -HALF_GRID_WORLD_SIZE,
    width: GRID_WORLD_SIZE,
    height: GRID_WORLD_SIZE,
  },
  hud: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hudTitle: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hudText: {
    ...typography.captionSmall,
    color: colors.textSecondary,
  },
});
