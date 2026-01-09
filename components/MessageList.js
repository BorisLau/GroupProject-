import React from "react";
import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { colors, typography, spacing, borderRadius } from "../styles/theme";

export default function MessageList({ messages }) {
  return (
    <ScrollView
      style={styles.chatScroll}
      contentContainerStyle={styles.messagesContainer}
      keyboardShouldPersistTaps="handled"
    >
      {messages.length === 0 && (
        <View style={styles.emptyState}>
          {/* Empty state - you can add content here if needed */}
        </View>
      )}

      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.messageBubble,
            message.role === "user"
              ? styles.userBubble
              : styles.assistantBubble,
          ]}
        >
          {message.fileName ? (
            <Text style={styles.fileNameText}>📎 {message.fileName}</Text>
          ) : null}
          {message.text ? (
            <Text
              style={[
                styles.messageText,
                message.role === "user" && styles.messageTextUser,
              ]}
            >
              {message.text}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chatScroll: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  messagesContainer: {
    paddingBottom: Platform.OS === "ios" ? 160 : 140,
  },
  emptyState: {
    marginTop: spacing.xxl,
    alignItems: "center",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.userBubble,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.assistantBubble,
  },
  messageText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  messageTextUser: {
    color: colors.textOnPrimary,
  },
  fileNameText: {
    ...typography.caption,
    marginBottom: 4,
    color: colors.textPrimary,
  },
});
