import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { useAuth } from "../../../contexts/AuthContext";
import { borderRadius, colors, spacing, typography } from "../../../styles/theme";

const MIN_SCALE = 0.6;
const MAX_SCALE = 6;
const DOT_STEP = 24;
const DOT_RADIUS = 1.6;
const WHEEL_ZOOM_SENSITIVITY = 0.0018;
const GRID_OVERSCAN = 6;

const clamp = (value, min, max) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

const modulo = (value, divisor) => {
  "worklet";
  return ((value % divisor) + divisor) % divisor;
};

export default function CanvasScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  const pinchWorldX = useSharedValue(0);
  const pinchWorldY = useSharedValue(0);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, router, session]);

  const panGesture = Gesture.Pan()
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
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;

      pinchWorldX.value = (event.focalX - startTranslateX.value) / startScale.value;
      pinchWorldY.value = (event.focalY - startTranslateY.value) / startScale.value;
    })
    .onUpdate((event) => {
      if (!Number.isFinite(event.scale)) {
        return;
      }

      const nextScale = clamp(startScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      translateX.value = event.focalX - pinchWorldX.value * nextScale;
      translateY.value = event.focalY - pinchWorldY.value * nextScale;
      scale.value = nextScale;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const gridAnimatedStyle = useAnimatedStyle(() => {
    const scaledStep = DOT_STEP * scale.value;
    const safeStep = Math.max(4, scaledStep);
    const offsetX = modulo(translateX.value, safeStep) - safeStep;
    const offsetY = modulo(translateY.value, safeStep) - safeStep;

    return {
      transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale: scale.value }],
    };
  });

  const handleReset = useCallback(() => {
    scale.value = withTiming(1, { duration: 180 });
    translateX.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(0, { duration: 180 });
  }, [scale, translateX, translateY]);

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

      const hasZoomModifier = !!native.ctrlKey || !!native.metaKey;

      if (!hasZoomModifier) {
        translateX.value -= native.deltaX;
        translateY.value -= native.deltaY;
        return;
      }

      const currentScale = scale.value;
      const nextScale = clamp(
        currentScale * Math.exp(-native.deltaY * WHEEL_ZOOM_SENSITIVITY),
        MIN_SCALE,
        MAX_SCALE
      );
      const focalX = Number.isFinite(native.locationX) ? native.locationX : viewport.width / 2;
      const focalY = Number.isFinite(native.locationY) ? native.locationY : viewport.height / 2;
      const worldX = (focalX - translateX.value) / currentScale;
      const worldY = (focalY - translateY.value) / currentScale;

      translateX.value = focalX - worldX * nextScale;
      translateY.value = focalY - worldY * nextScale;
      scale.value = nextScale;
    },
    [scale, translateX, translateY, viewport.height, viewport.width]
  );

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

  const renderWidth = viewport.width > 0 ? (viewport.width / MIN_SCALE)*GRID_OVERSCAN : 0;
  const renderHeight = viewport.height > 0 ? (viewport.height / MIN_SCALE)*GRID_OVERSCAN : 0;
  const renderLeft = (viewport.width - renderWidth) / 2;
  const renderTop = (viewport.height - renderHeight) / 2;

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

          <Text style={styles.title}>Canvas</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
            <Text style={styles.primaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.canvasContainer}
          {...(Platform.OS === "web" ? { onWheel: handleWheel } : null)}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewport({ width, height });
          }}
        >
          <GestureDetector gesture={composedGesture}>
            <View style={StyleSheet.absoluteFill}>
              {viewport.width > 0 && viewport.height > 0 ? (
                <Animated.View
                  style={[
                    styles.gridLayer,
                    {
                      width: renderWidth,
                      height: renderHeight,
                      left: renderLeft,
                      top: renderTop,
                    },
                    gridAnimatedStyle,
                  ]}
                >
                  <Svg width={renderWidth} height={renderHeight} style={StyleSheet.absoluteFill}>
                    <Defs>
                      <Pattern
                        id="dotGridPattern"
                        x={0}
                        y={0}
                        width={DOT_STEP}
                        height={DOT_STEP}
                        patternUnits="userSpaceOnUse"
                      >
                        <Circle
                          cx={DOT_STEP / 2}
                          cy={DOT_STEP / 2}
                          r={DOT_RADIUS}
                          fill="#cbd4e1"
                        />
                      </Pattern>
                    </Defs>
                    <Rect x={0} y={0} width={renderWidth} height={renderHeight} fill="#f8fafd" />
                    <Rect
                      x={0}
                      y={0}
                      width={renderWidth}
                      height={renderHeight}
                      fill="url(#dotGridPattern)"
                    />
                  </Svg>
                </Animated.View>
              ) : null}
            </View>
          </GestureDetector>
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
  },
});
