/**
 * 优化后的 Sidebar 组件
 * 展示如何使用 selector 和 memo 避免不必要的重渲染
 */

import React, { useEffect, useRef, useState, memo, useCallback } from "react";
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
import {
  useConversationsSelector,
  useConversationsDispatch,
} from "../hooks/useConversations";
import { colors, typography, spacing, borderRadius, shadows } from "../styles/theme";

const SIDEBAR_WIDTH = 260;
const OPEN_ANIMATION_DURATION = 220;
const CLOSE_ANIMATION_DURATION = 180;
const DOUBLE_PRESS_DELAY_MS = 320;

/**
 * 单个对话项组件 - 使用 memo 优化
 * 只有在 conversation 或 isActive 变化时才重渲染
 */
const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onPress,
  onLongPress,
}) {
  // 使用 useCallback 稳定回调引用
  const handlePress = useCallback(() => {
    onPress(conversation);
  }, [conversation, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(conversation);
  }, [conversation, onLongPress]);

  return (
    <TouchableOpacity
      style={[
        styles.sidebarItem,
        isActive && styles.sidebarItemActive,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <Text
        style={[
          styles.sidebarItemText,
          isActive && styles.sidebarItemTextActive,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {conversation.title}
      </Text>
    </TouchableOpacity>
  );
});

/**
 * 对话列表组件 - 使用 memo 优化
 */
const ConversationList = memo(function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}) {
  // 双击检测 ref
  const pendingPressRef = useRef({ id: null, timeoutId: null });

  const clearPendingPress = useCallback(() => {
    if (pendingPressRef.current.timeoutId) {
      clearTimeout(pendingPressRef.current.timeoutId);
    }
    pendingPressRef.current = { id: null, timeoutId: null };
  }, []);

  useEffect(() => {
    return () => clearPendingPress();
  }, [clearPendingPress]);

  const handleConversationPress = useCallback((conversation) => {
    // 双击检测逻辑
    if (pendingPressRef.current.id === conversation.id) {
      clearPendingPress();
      onRenameConversation?.(conversation);
      return;
    }

    clearPendingPress();
    const timeoutId = setTimeout(() => {
      onSelectConversation(conversation.id);
      clearPendingPress();
    }, DOUBLE_PRESS_DELAY_MS);

    pendingPressRef.current = { id: conversation.id, timeoutId };
  }, [onSelectConversation, onRenameConversation, clearPendingPress]);

  // 使用 useCallback 稳定 renderItem 函数
  const renderItem = useCallback((conversation) => (
    <ConversationItem
      key={conversation.id}
      conversation={conversation}
      isActive={conversation.id === currentConversationId}
      onPress={handleConversationPress}
      onLongPress={onDeleteConversation}
    />
  ), [currentConversationId, handleConversationPress, onDeleteConversation]);

  return (
    <ScrollView style={styles.sidebarList}>
      {conversations.map(renderItem)}
    </ScrollView>
  );
});

/**
 * 底部操作按钮组件
 */
const FooterActions = memo(function FooterActions({
  onNewConversation,
  onOpenSettings,
}) {
  return (
    <View style={styles.footerActions}>
      <TouchableOpacity style={styles.newChatButton} onPress={onNewConversation}>
        <Text style={styles.newChatButtonText}>+ 新的任務</Text>
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
  );
});

/**
 * 使用 selector 获取 Sidebar 需要的状态
 * 这样只有 conversations 或 currentConversationId 变化时才触发重渲染
 */
const useSidebarState = () => {
  const conversations = useConversationsSelector((s) => s.conversations);
  const currentConversationId = useConversationsSelector((s) => s.currentConversationId);
  
  return { conversations, currentConversationId };
};

/**
 * 使用 dispatch hook（不会触发重渲染）
 */
const useSidebarDispatch = () => {
  const { selectConversation, createNewConversation } = useConversationsDispatch();
  return { selectConversation, createNewConversation };
};

/**
 * 主 Sidebar 组件 - 使用 memo 避免不必要的重渲染
 * 只有当 isOpen 或相关状态变化时才重渲染
 */
const Sidebar = memo(function Sidebar({
  isOpen,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onClose,
}) {
  // 使用 selector 只订阅需要的状态
  const { conversations, currentConversationId } = useSidebarState();
  
  // 使用 dispatch hook（不会触发重渲染）
  const { selectConversation, createNewConversation } = useSidebarDispatch();

  // 动画状态
  const [shouldRender, setShouldRender] = useState(isOpen);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  // 动画效果
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
      return;
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
          { transform: [{ translateX }] },
        ]}
      >
        <Text style={styles.sidebarTitle}>任務紀錄</Text>

        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={selectConversation}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
        />

        <FooterActions
          onNewConversation={createNewConversation}
          onOpenSettings={onOpenSettings}
        />
      </Animated.View>
    </View>
  );
});

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
  footerActions: {
    marginTop: spacing.md,
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

export default Sidebar;
