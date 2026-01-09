import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, borderRadius } from "../styles/theme";

export default function Composer({
  inputText,
  onChangeText,
  attachedFileName,
  onAttachFile,
  onSend,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.inputInner}>
        <ScrollView
          style={styles.inputScroll}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            placeholder="輸入製作mindmap的資料..."
            placeholderTextColor={colors.textLight}
            value={inputText}
            onChangeText={onChangeText}
            multiline={true}
            style={styles.textInput}
          />
        </ScrollView>

        {attachedFileName ? (
          <Text style={styles.attachedFileLabel}>
            已選擇檔案：{attachedFileName}
          </Text>
        ) : null}

        <View style={styles.inputActionsRow}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={onAttachFile}
          >
            <Text style={styles.attachButtonText}>上傳檔案</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendButton} onPress={onSend}>
            <Text style={styles.sendButtonText}>發送</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  inputInner: {
    borderWidth: 1,
    borderColor: colors.textLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: colors.surface,
  },
  inputScroll: {
    maxHeight: Platform.OS === "ios" ? 100 : 90,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 6,
    color: colors.textPrimary,
  },
  attachedFileLabel: {
    marginTop: 4,
    ...typography.captionSmall,
  },
  inputActionsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attachButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  attachButtonText: {
    ...typography.bodySmall,
  },
  sendButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
  },
  sendButtonText: {
    ...typography.bodySmall,
    color: colors.textOnPrimary,
    fontWeight: "500",
  },
});
