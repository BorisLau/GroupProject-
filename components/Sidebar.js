import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { colors, typography, spacing, borderRadius, shadows } from "../styles/theme";

export default function Sidebar({
  isOpen,
  conversations,
  currentConversationId,
  onSelectConversation,
  onLongPressConversation,
  onNewConversation,
  onClose,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <View style={styles.sidebarOverlay}>
      <TouchableOpacity
        style={styles.overlayBackground}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>聊天紀錄</Text>

        <ScrollView style={styles.sidebarList}>
          {conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={[
                styles.sidebarItem,
                conversation.id === currentConversationId &&
                  styles.sidebarItemActive,
              ]}
              onPress={() => onSelectConversation(conversation.id)}
              onLongPress={() => onLongPressConversation(conversation)}
            >
              <Text
                style={[
                  styles.sidebarItemText,
                  conversation.id === currentConversationId &&
                    styles.sidebarItemTextActive,
                ]}
              >
                {conversation.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={onNewConversation}
        >
          <Text style={styles.newChatButtonText}>+ 新的聊天</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    zIndex: 10,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sidebar: {
    width: 260,
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    ...shadows.medium,
  },
  sidebarTitle: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  sidebarList: {
    flex: 1,
  },
  sidebarItem: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 6,
  },
  sidebarItemActive: {
    backgroundColor: colors.borderLight,
  },
  sidebarItemText: {
    ...typography.bodySmall,
  },
  sidebarItemTextActive: {
    fontWeight: "600",
  },
  newChatButton: {
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  newChatButtonText: {
    ...typography.bodySmall,
    fontWeight: "500",
  },
});
