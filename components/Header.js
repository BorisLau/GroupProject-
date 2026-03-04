import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../styles/theme";

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
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.headerTitle,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  quickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  signOutButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.disabled,
  },
  signOutText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  menuButton: {
    width: 28,
    height: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuLine: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
  },
  canvasButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  canvasButtonText: {
    fontSize: 13,
    color: colors.textOnPrimary,
    fontWeight: "600",
  },
});
