import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "../styles/theme";

export default function RenameModal({
  visible,
  title,
  onChangeTitle,
  onCancel,
  onSave,
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.renameOverlay}>
      <View style={styles.renameContainer}>
        <Text style={styles.renameTitle}>修改聊天名稱</Text>
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder="輸入新的聊天名稱"
          placeholderTextColor={colors.textLight}
          style={styles.renameInput}
        />
        <View style={styles.renameButtonsRow}>
          <TouchableOpacity
            style={styles.renameCancelButton}
            onPress={onCancel}
          >
            <Text style={styles.renameCancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.renameSaveButton}
            onPress={onSave}
          >
            <Text style={styles.renameSaveText}>儲存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  renameOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlayDark,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  renameContainer: {
    width: "80%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  renameTitle: {
    ...typography.subtitle,
  },
  renameInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.textPrimary,
  },
  renameButtonsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  renameCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.disabled,
    marginRight: spacing.sm,
  },
  renameSaveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
  },
  renameCancelText: {
    ...typography.bodySmall,
  },
  renameSaveText: {
    ...typography.bodySmall,
    color: colors.textOnPrimary,
    fontWeight: "500",
  },
});
