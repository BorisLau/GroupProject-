import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius, shadows } from "../styles/theme";

const SIDEBAR_WIDTH = 260;
const OPEN_ANIMATION_DURATION = 220;
const CLOSE_ANIMATION_DURATION = 180;

export default function Sidebar({
  isOpen,
  conversations,
  currentConversationId,
  onSelectConversation,
  onLongPressConversation,
  onNewConversation,
  onOpenSettings,
  onClose,
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: OPEN_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: OPEN_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return undefined;
    }

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: CLOSE_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: SIDEBAR_WIDTH,
        duration: CLOSE_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });

    return undefined;
  }, [isOpen, overlayOpacity, translateX]);

  if (!shouldRender) {
    return null;
  }

  return (
    <View style={styles.sidebarOverlay} pointerEvents="box-none">
      <Animated.View style={[styles.overlayLayer, { opacity: overlayOpacity }]}>
        <TouchableOpacity
          style={styles.overlayBackground}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX }],
          },
        ]}
      >
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

        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.newChatButton} onPress={onNewConversation}>
            <Text style={styles.newChatButtonText}>+ 新的聊天</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings}>
            <Ionicons
              name="settings-outline"
              size={16}
              color={colors.textSecondary}
              style={styles.settingsIcon}
            />
            <Text style={styles.settingsButtonText}>設定</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
    zIndex: 10,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
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
  footerActions: {
    marginTop: spacing.md,
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
  settingsButton: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  settingsIcon: {
    marginTop: 1,
  },
  settingsButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
