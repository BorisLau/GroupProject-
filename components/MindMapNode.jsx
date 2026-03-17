import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { borderRadius, colors, shadows, spacing, typography } from "../styles/theme";

const DOUBLE_TAP_DELAY_MS = 280;
const HANDLE_SIZE = 10;
const HANDLE_SIDES = ["top", "right", "bottom", "left"];

const HANDLE_POSITIONS = {
  top: {
    top: -(HANDLE_SIZE / 2),
    left: "50%",
    transform: [{ translateX: -(HANDLE_SIZE / 2) }],
  },
  right: {
    right: -(HANDLE_SIZE / 2),
    top: "50%",
    transform: [{ translateY: -(HANDLE_SIZE / 2) }],
  },
  bottom: {
    bottom: -(HANDLE_SIZE / 2),
    left: "50%",
    transform: [{ translateX: -(HANDLE_SIZE / 2) }],
  },
  left: {
    left: -(HANDLE_SIZE / 2),
    top: "50%",
    transform: [{ translateY: -(HANDLE_SIZE / 2) }],
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MindMapNode({
  id,
  text,
  x,
  y,
  width = 220,
  minHeight = 96,
  editable = true,
  draggable = false,
  showHandles = false,
  selected = false,
  connectMode = false,
  onTextCommit,
  onNodePress,
  onDeleteRequest,
  onContextMenuRequest,
  onPositionChange,
  viewportScale,
  canvasPanGesture,
  activeDragNodeId,
  activeDragX,
  activeDragY,
}) {
  const usesNativeDragPreview = Platform.OS !== "web";
  const inputRef = useRef(null);
  const lastTapTs = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeletePressing, setIsDeletePressing] = useState(false);
  const [draftText, setDraftText] = useState(text || "");
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const previewX = useSharedValue(x);
  const previewY = useSharedValue(y);
  const pressDepth = useSharedValue(0);

  useEffect(() => {
    if (!isEditing) {
      setDraftText(text || "");
    }
  }, [isEditing, text]);

  useEffect(() => {
    if (!isEditing) {
      return undefined;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [isEditing]);

  useEffect(() => {
    if (!connectMode) {
      return;
    }

    lastTapTs.current = 0;
    setIsDeletePressing(false);
    setIsEditing(false);
    setDraftText(text || "");
  }, [connectMode, text]);

  useEffect(() => {
    pressDepth.value = withTiming(isDeletePressing ? 1 : 0, {
      duration: isDeletePressing ? 180 : 140,
    });
  }, [isDeletePressing, pressDepth]);

  useEffect(() => {
    if (!usesNativeDragPreview) {
      return;
    }

    if (activeDragNodeId?.value === id) {
      return;
    }

    previewX.value = x;
    previewY.value = y;
  }, [activeDragNodeId, id, previewX, previewY, usesNativeDragPreview, x, y]);

  const handleBodyPress = () => {
    if (connectMode) {
      lastTapTs.current = 0;
      onNodePress?.(id);
      return;
    }

    if (!editable || isEditing) {
      return;
    }

    const now = Date.now();
    if (now - lastTapTs.current <= DOUBLE_TAP_DELAY_MS) {
      setDraftText(text || "");
      setIsEditing(true);
    }
    lastTapTs.current = now;
  };

  const handleCommit = () => {
    if (!isEditing) {
      return;
    }

    const normalized = draftText.trim();
    const nextText = normalized.length > 0 ? normalized : (text || "");

    if (onTextCommit && nextText !== text) {
      onTextCommit(id, nextText);
    }

    setDraftText(nextText);
    setIsEditing(false);
  };

  const handlePressIn = () => {
    if (isEditing) {
      return;
    }

    setIsDeletePressing(true);
  };

  const handlePressOut = () => {
    setIsDeletePressing(false);
  };

  const handleLongPress = async () => {
    if (isEditing) {
      return;
    }

    lastTapTs.current = 0;
    setIsDeletePressing(false);

    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Ignore haptics availability issues and continue with delete prompt.
      }
    }

    onDeleteRequest?.(id);
  };

  const handleContextMenu = (event) => {
    if (isEditing) {
      return;
    }

    if (typeof event?.preventDefault === "function") {
      event.preventDefault();
    }

    lastTapTs.current = 0;
    onContextMenuRequest?.(id, event?.nativeEvent || event);
  };

  const handlePositionChange = useCallback((nextX, nextY) => {
    onPositionChange?.(id, nextX, nextY);
  }, [id, onPositionChange]);

  const dragGesture = useMemo(
    () => {
      const gesture = Gesture.Pan()
        .enabled(draggable && !isEditing && typeof onPositionChange === "function")
        .minDistance(6)
        .maxPointers(1)
        .onStart(() => {
          const initialX = usesNativeDragPreview ? previewX.value : x;
          const initialY = usesNativeDragPreview ? previewY.value : y;

          dragStartX.value = initialX;
          dragStartY.value = initialY;

          if (usesNativeDragPreview) {
            previewX.value = initialX;
            previewY.value = initialY;
            activeDragNodeId.value = id;
            activeDragX.value = initialX;
            activeDragY.value = initialY;
          }
        })
        .onUpdate((event) => {
          const currentScale = Math.max(
            Number.isFinite(viewportScale?.value) ? viewportScale.value : 1,
            0.0001
          );
          const nextX = dragStartX.value + event.translationX / currentScale;
          const nextY = dragStartY.value + event.translationY / currentScale;

          if (usesNativeDragPreview) {
            previewX.value = nextX;
            previewY.value = nextY;
            activeDragNodeId.value = id;
            activeDragX.value = nextX;
            activeDragY.value = nextY;
            return;
          }

          runOnJS(handlePositionChange)(nextX, nextY);
        })
        .onEnd(() => {
          if (!usesNativeDragPreview) {
            return;
          }

          runOnJS(handlePositionChange)(previewX.value, previewY.value);
        })
        .onFinalize(() => {
          if (!usesNativeDragPreview) {
            return;
          }

          if (activeDragNodeId.value === id) {
            activeDragNodeId.value = null;
          }
        });

      if (canvasPanGesture) {
        gesture.blocksExternalGesture(canvasPanGesture);
      }

      return gesture;
    },
    [
      activeDragNodeId,
      activeDragX,
      activeDragY,
      canvasPanGesture,
      dragStartX,
      dragStartY,
      draggable,
      handlePositionChange,
      id,
      isEditing,
      onPositionChange,
      previewX,
      previewY,
      usesNativeDragPreview,
      viewportScale,
      x,
      y,
    ]
  );

  const isHighlighted = isEditing || selected;
  const deletePressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -6 * pressDepth.value },
      { scale: 1 + pressDepth.value * 0.025 },
    ],
    shadowOpacity: 0.05 + pressDepth.value * 0.14,
    shadowRadius: 2 + pressDepth.value * 10,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => {
    if (!usesNativeDragPreview) {
      return {};
    }

    return {
      transform: [
        { translateX: previewX.value },
        { translateY: previewY.value },
      ],
    };
  }, [previewX, previewY, usesNativeDragPreview]);

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        style={[
          styles.container,
          { width },
          !usesNativeDragPreview && { left: x, top: y },
          containerAnimatedStyle,
        ]}
      >
        <AnimatedPressable
          style={[
            styles.nodeBody,
            showHandles && styles.nodeBodyConnectMode,
            isHighlighted && styles.nodeBodyActive,
            selected && styles.nodeBodySelected,
            isDeletePressing && styles.nodeBodyDeleteReady,
            deletePressAnimatedStyle,
            { minHeight },
          ]}
          onPress={handleBodyPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleLongPress}
          delayLongPress={750}
          onContextMenu={handleContextMenu}
        >
          {isEditing && !connectMode ? (
            <TextInput
              ref={inputRef}
              value={draftText}
              onChangeText={setDraftText}
              onBlur={handleCommit}
              onSubmitEditing={handleCommit}
              style={styles.input}
              multiline
              blurOnSubmit
              returnKeyType="done"
              placeholder="輸入節點內容"
              placeholderTextColor={colors.textLight}
            />
          ) : (
            <Text style={styles.label}>{text || "Untitled Node"}</Text>
          )}
        </AnimatedPressable>

        {showHandles
          ? HANDLE_SIDES.map((side) => (
              <View
                key={side}
                pointerEvents="none"
                style={[styles.handle, HANDLE_POSITIONS[side]]}
              />
            ))
          : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
  nodeBody: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: "center",
    ...shadows.small,
    zIndex: 1,
  },
  nodeBodyActive: {
    borderColor: colors.primary,
    shadowOpacity: 0.12,
  },
  nodeBodyConnectMode: {
    borderColor: "#b8ccef",
  },
  nodeBodySelected: {
    borderColor: colors.primaryDark,
    borderWidth: 2,
    backgroundColor: "#eef5ff",
    shadowOpacity: 0.18,
  },
  nodeBodyDeleteReady: {
    borderColor: "#f08a7b",
    backgroundColor: "#fff8f6",
    shadowColor: "#0f172a",
    elevation: 9,
  },
  label: {
    ...typography.body,
    textAlign: "center",
    color: colors.textPrimary,
    lineHeight: 20,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: "center",
    padding: 0,
    minHeight: 20,
  },
  handle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 3,
    ...shadows.small,
  },
});
