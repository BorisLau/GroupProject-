import React from "react";
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "../styles/theme";

/**
 * 进度条组件
 */
const ProgressBar = ({ progress, statusText }) => {
  // 确保进度在 0-100 之间
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View 
          style={[
            styles.progressBarFill,
            { width: `${clampedProgress}%` }
          ]} 
        />
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.progressPercentage}>{Math.round(clampedProgress)}%</Text>
        {statusText ? (
          <Text style={styles.progressStatus} numberOfLines={1}>
            {statusText}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/**
 * 上传中心面板组件
 * @param {Object} props
 * @param {Function} props.onUploadPress - 上传按钮点击回调
 * @param {Function} props.onCancelPress - 取消按钮点击回调（可选）
 * @param {string} props.selectedFileName - 已选择的文件名
 * @param {boolean} props.isBusy - 是否正在处理中
 * @param {number} props.progress - 上传进度 0-100（可选）
 * @param {string} props.statusText - 状态文本（可选）
 * @param {boolean} props.hasApiKey - 是否已设置 API Key
 * @param {boolean} props.isCheckingApiKey - 是否正在检查 API Key
 */
export default function UploadCenterPanel({
  onUploadPress,
  onCancelPress,
  selectedFileName,
  isBusy = false,
  progress = 0,
  statusText = "",
  hasApiKey = false,
  isCheckingApiKey = false,
}) {
  const apiKeyStatusText = isCheckingApiKey
    ? "DeepSeek API Key 狀態檢查中..."
    : hasApiKey
      ? "DeepSeek API Key：已設定"
      : "DeepSeek API Key：尚未設定";

  // 判断是否显示进度条（有进度值且正在处理中）
  const showProgress = isBusy && progress > 0 && progress < 100;
  // 判断是否显示取消按钮（正在处理且提供了取消回调）
  const showCancelButton = isBusy && onCancelPress && progress < 100;

  return (
    <View style={styles.container}>
      {/* 上传按钮区域 */}
      <TouchableOpacity 
        style={[
          styles.uploadButton, 
          isBusy && styles.uploadButtonDisabled
        ]} 
        onPress={onUploadPress} 
        disabled={isBusy}
        activeOpacity={0.8}
      >
        {isBusy ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.uploadIcon} />
        ) : (
          <Ionicons
            name="cloud-upload-outline"
            size={58}
            color={colors.primary}
            style={styles.uploadIcon}
          />
        )}
        
        <Text style={styles.uploadTitle}>
          {isBusy ? "處理中..." : "上傳檔案"}
        </Text>
        
        <Text style={styles.uploadHint}>
          {isBusy 
            ? "正在處理您的文件，請稍候..." 
            : "點擊後選擇文件以建立內容"
          }
        </Text>

        {/* 进度条 */}
        {showProgress && (
          <ProgressBar progress={progress} statusText={statusText} />
        )}

        {/* 取消按钮 */}
        {showCancelButton && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancelPress}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={styles.cancelButtonText}>取消上傳</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* API Key 状态 */}
      <Text style={[
        styles.apiKeyStatusLabel, 
        hasApiKey ? styles.apiKeyStatusReady : styles.apiKeyStatusMissing
      ]}>
        {apiKeyStatusText}
      </Text>

      {/* 已选择文件名 */}
      {selectedFileName ? (
        <Text numberOfLines={1} style={styles.selectedFileLabel}>
          已選擇檔案：{selectedFileName}
        </Text>
      ) : null}

      {/* 状态文本（非上传阶段显示） */}
      {statusText && !showProgress ? (
        <Text numberOfLines={2} style={styles.statusLabel}>
          {statusText}
        </Text>
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
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    ...shadows.small,
  },
  uploadButtonDisabled: {
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.disabled,
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
    marginBottom: spacing.md,
  },
  // 进度条样式
  progressContainer: {
    width: "100%",
    marginTop: spacing.md,
    alignItems: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressPercentage: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.primary,
  },
  progressStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "center",
  },
  // 取消按钮样式
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.xs,
  },
  cancelButtonText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: "500",
  },
  // 状态标签样式
  apiKeyStatusLabel: {
    marginTop: spacing.md,
    width: "66%",
    ...typography.caption,
    textAlign: "center",
  },
  apiKeyStatusReady: {
    color: colors.success,
  },
  apiKeyStatusMissing: {
    color: colors.textSecondary,
  },
  selectedFileLabel: {
    marginTop: spacing.sm,
    width: "66%",
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  statusLabel: {
    marginTop: spacing.sm,
    width: "66%",
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: "center",
  },
});
