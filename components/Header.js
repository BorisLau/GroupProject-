import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale, scale as scaleSize, verticalScale } from "react-native-size-matters";
import { borderRadius, colors, typography, spacing } from "../styles/theme";

const IS_NATIVE_MOBILE = Platform.OS === "ios" || Platform.OS === "android";
const hs = (value) => (IS_NATIVE_MOBILE ? scaleSize(value) : value);
const vs = (value) => (IS_NATIVE_MOBILE ? verticalScale(value) : value);
const ms = (value) => (IS_NATIVE_MOBILE ? moderateScale(value) : value);

export default function Header({
  onMenuPress,
  onCanvasPress,
  showSignOut = false,
  onSignOut,
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Smart Map</Text>
      <View style={styles.headerActions}>
        {showSignOut && onSignOut && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={onSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            accessibilityRole="button"
            accessibilityLabel="Open sidebar"
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>

          {onCanvasPress && (
            <TouchableOpacity
              style={styles.canvasButton}
              onPress={onCanvasPress}
              accessibilityRole="button"
              accessibilityLabel="Open canvas"
            >
              <Ionicons name="grid-outline" size={16} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: vs(50),
    paddingHorizontal: hs(spacing.md),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.headerTitle,
    fontSize: ms(16),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(spacing.sm),
  },
  quickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(spacing.xs),
  },
  signOutButton: {
    width: hs(32),
    height: vs(32),
    borderRadius: ms(borderRadius.sm),
    backgroundColor: colors.disabled,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    width: hs(32),
    height: vs(32),
    justifyContent: "center",
    alignItems: "center",
  },
  menuLine: {
    width: hs(14),
    height: vs(2),
    borderRadius: ms(1),
    backgroundColor: colors.textSecondary,
    marginVertical: vs(1),
  },
  canvasButton: {
    width: hs(32),
    height: vs(32),
    borderRadius: ms(borderRadius.sm),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
