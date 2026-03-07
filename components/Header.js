import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
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
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>

          {onCanvasPress && (
            <TouchableOpacity style={styles.canvasButton} onPress={onCanvasPress}>
              <Text style={styles.canvasButtonText}>Canvas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: vs(60),
    paddingHorizontal: hs(spacing.lg),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.headerTitle,
    fontSize: ms(typography.headerTitle.fontSize),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(spacing.md),
  },
  quickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(spacing.sm),
  },
  signOutButton: {
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: hs(spacing.md),
    borderRadius: ms(borderRadius.sm),
    backgroundColor: colors.disabled,
  },
  signOutText: {
    fontSize: ms(14),
    color: colors.textSecondary,
    fontWeight: "500",
  },
  menuButton: {
    width: hs(28),
    height: vs(24),
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuLine: {
    width: "100%",
    height: vs(3),
    borderRadius: ms(2),
    backgroundColor: colors.textSecondary,
  },
  canvasButton: {
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: hs(spacing.md),
    borderRadius: ms(borderRadius.sm),
    backgroundColor: colors.primary,
  },
  canvasButtonText: {
    fontSize: ms(13),
    color: colors.textOnPrimary,
    fontWeight: "600",
  },
});
