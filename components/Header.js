import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../styles/theme";

export default function Header({ onMenuPress, showSignOut = false, onSignOut }) {
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
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
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
});
