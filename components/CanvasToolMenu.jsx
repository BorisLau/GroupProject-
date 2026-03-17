import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { borderRadius, colors, shadows, spacing } from "../styles/theme";

const BUTTON_SIZE = 54;
const TOOL_GAP = 12;

function ToolButton({
  icon,
  active = false,
  flashOnPress = false,
  onPress,
  accessibilityLabel,
}) {
  const flashTimerRef = useRef(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const isHighlighted = active || isFlashing;

  useEffect(() => () => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
  }, []);

  const handlePress = () => {
    if (flashOnPress) {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }

      setIsFlashing(true);
      flashTimerRef.current = setTimeout(() => {
        setIsFlashing(false);
        flashTimerRef.current = null;
      }, 180);
    }

    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.toolButton,
        isHighlighted && styles.toolButtonActive,
        pressed && styles.toolButtonPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={isHighlighted ? colors.textOnPrimary : colors.textPrimary}
      />
    </Pressable>
  );
}

export default function CanvasToolMenu({
  expanded = false,
  dragModeEnabled = false,
  showConnectionPoints = false,
  onToggleExpanded,
  onToggleDragMode,
  onAddNode,
  onToggleConnectionPoints,
}) {
  const expansion = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    expansion.value = withTiming(expanded ? 1 : 0, { duration: 180 });
  }, [expanded, expansion]);

  const toolsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: expansion.value,
    transform: [
      { translateX: (1 - expansion.value) * 18 },
      { scale: 0.92 + expansion.value * 0.08 },
    ],
  }));

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <Animated.View
        pointerEvents={expanded ? "auto" : "none"}
        style={[styles.toolsRow, toolsAnimatedStyle]}
      >
        <ToolButton
          icon="move-outline"
          active={dragModeEnabled}
          onPress={onToggleDragMode}
          accessibilityLabel="切換節點拖動模式"
        />
        <ToolButton
          icon="add-outline"
          flashOnPress
          onPress={onAddNode}
          accessibilityLabel="新增節點"
        />
        <ToolButton
          icon="git-network-outline"
          active={showConnectionPoints}
          onPress={onToggleConnectionPoints}
          accessibilityLabel="切換連線模式"
        />
      </Animated.View>

      <Pressable
        onPress={onToggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "收起畫布工具" : "展開畫布工具"}
        style={[styles.toolButton, styles.primaryButton, expanded && styles.primaryButtonActive]}
      >
        <Ionicons
          name={expanded ? "close-outline" : "menu-outline"}
          size={24}
          color={colors.textOnPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  toolsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: TOOL_GAP,
    gap: TOOL_GAP,
  },
  toolButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.medium,
  },
  toolButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toolButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
  primaryButton: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  primaryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
