import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "../styles/theme";

export default function UploadCenterPanel({
  onUploadPress,
  selectedFileName,
  isBusy = false,
  statusText = "",
  hasApiKey = false,
  isCheckingApiKey = false,
}) {
  const apiKeyStatusText = isCheckingApiKey
    ? "OpenRouter API Key 狀態檢查中..."
    : hasApiKey
      ? "OpenRouter API Key：已設定"
      : "OpenRouter API Key：尚未設定";

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.uploadButton, isBusy && styles.uploadButtonDisabled]} onPress={onUploadPress} disabled={isBusy}>
        <Ionicons
          name="cloud-upload-outline"
          size={58}
          color={colors.primary}
          style={styles.uploadIcon}
        />
        <Text style={styles.uploadTitle}>上傳檔案</Text>
        <Text style={styles.uploadHint}>
          {isBusy ? "AI 正在生成中，請稍候..." : "點擊後選擇文件以建立內容"}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.apiKeyStatusLabel, hasApiKey ? styles.apiKeyStatusReady : styles.apiKeyStatusMissing]}>
        {apiKeyStatusText}
      </Text>

      {selectedFileName ? (
        <Text numberOfLines={1} style={styles.selectedFileLabel}>
          已選擇檔案：{selectedFileName}
        </Text>
      ) : null}

      {statusText ? (
        <Text style={styles.statusLabel}>{statusText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  uploadButton: {
    width: "66%",
    height: "66%",
    minHeight: 220,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    ...shadows.small,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadIcon: {
    marginBottom: spacing.md,
  },
  uploadTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  uploadHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  selectedFileLabel: {
    marginTop: spacing.md,
    width: "66%",
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  apiKeyStatusLabel: {
    marginTop: spacing.md,
    width: "66%",
    ...typography.caption,
    textAlign: "center",
  },
  apiKeyStatusReady: {
    color: colors.primary,
  },
  apiKeyStatusMissing: {
    color: colors.textSecondary,
  },
  statusLabel: {
    marginTop: spacing.sm,
    width: "66%",
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 18,
  },
});
