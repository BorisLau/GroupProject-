/**
 * 优化后的 Index 页面示例
 * 展示如何使用新的状态管理 hooks 获得最佳性能
 */

import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useState, memo } from "react";
import {
  Alert,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth, useAuthSelector } from "../contexts/AuthContext";
import {
  useConversationsDispatch,
  useConversationsSelector,
  useCurrentConversation,
  useConversationsLoading,
} from "../hooks/useConversations";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import UploadCenterPanel from "../components/UploadCenterPanel";
import RenameModal from "../components/RenameModal";
import { finalizeGeneratedMindmap } from "../src/features/mindmap/ai/generationPipeline";
import {
  createMindmapJob,
  getDeepSeekKeyStatus,
  getMindmapById,
  getMindmapJob,
} from "../lib/backendApi";
import { colors } from "../styles/theme";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_POLL_ATTEMPTS = 90;

/**
 * 使用 selector 获取计算后的状态
 * 避免不必要的重渲染
 */
const useIndexPageState = () => {
  // 使用 useAuthSelector 只订阅 session，避免其他 auth 状态变化触发重渲染
  const session = useAuthSelector((auth) => auth.session);
  const authLoading = useAuthSelector((auth) => auth.loading);

  // 使用专用 hooks 只订阅需要的状态
  const currentConversation = useCurrentConversation();
  const conversationsLoading = useConversationsLoading();
  
  // 使用 selector 获取派生状态
  const conversations = useConversationsSelector((s) => s.conversations);
  const currentConversationId = useConversationsSelector((s) => s.currentConversationId);

  return {
    session,
    authLoading,
    currentConversation,
    conversations,
    currentConversationId,
    conversationsLoading,
  };
};

/**
 * 页面主体组件 - 使用 memo 避免不必要的重渲染
 */
const IndexPageContent = memo(function IndexPageContent({
  currentConversation,
  currentConversationId,
  conversations,
  onSelectConversation,
  onCreateNewConversation,
  onRenameConversation,
  onRemoveConversation,
  onUpdateConversation,
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");

  const attachedFileName = currentConversation?.selectedFileName || "";
  const isGenerating = Boolean(currentConversation?.isGenerating);
  const generationStatus = currentConversation?.generationStatus || "";

  const handleOpenCanvas = useCallback(() => {
    router.push("/canvas");
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    setIsSidebarOpen(false);
    router.push("/settings");
  }, [router]);

  const handleRenameCancel = useCallback(() => {
    setRenameTargetId(null);
    setRenameTitle("");
  }, []);

  const handleRenameSave = useCallback(() => {
    if (!renameTargetId) return;
    const trimmed = renameTitle.trim();
    if (!trimmed) {
      handleRenameCancel();
      return;
    }
    onRenameConversation(renameTargetId, trimmed);
    handleRenameCancel();
  }, [renameTargetId, renameTitle, onRenameConversation, handleRenameCancel]);

  const handleDeleteConversation = useCallback((conversation) => {
    if (!conversation?.id) return;

    Alert.alert(
      "刪除任務",
      `確定要刪除「${conversation.title}」嗎？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              await onRemoveConversation(conversation.id);
            } catch (error) {
              Alert.alert("刪除失敗", error?.message || "無法刪除任務，請稍後再試。");
            }
          },
        },
      ]
    );
  }, [onRemoveConversation]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.root}>
        <Header
          onMenuPress={toggleSidebar}
          onCanvasPress={handleOpenCanvas}
          showSignOut={true}
        />

        <UploadCenterPanel
          onUploadPress={() => {}}
          selectedFileName={attachedFileName}
          isBusy={isGenerating}
          statusText={generationStatus}
          hasApiKey={true}
          isCheckingApiKey={false}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={onSelectConversation}
          onRenameConversation={(conv) => {
            setRenameTargetId(conv.id);
            setRenameTitle(conv.title);
          }}
          onDeleteConversation={handleDeleteConversation}
          onNewConversation={onCreateNewConversation}
          onOpenSettings={handleOpenSettings}
          onClose={() => setIsSidebarOpen(false)}
        />

        <RenameModal
          visible={!!renameTargetId}
          title={renameTitle}
          onChangeTitle={setRenameTitle}
          onCancel={handleRenameCancel}
          onSave={handleRenameSave}
        />
      </View>
    </SafeAreaView>
  );
});

/**
 * 主页面组件
 */
export default function Index() {
  const router = useRouter();
  const { signOut } = useAuth();
  
  // 使用优化后的状态 hooks
  const {
    session,
    authLoading,
    currentConversation,
    conversations,
    currentConversationId,
    conversationsLoading,
  } = useIndexPageState();

  // 使用 dispatch hook（不会触发重渲染）
  const {
    selectConversation,
    createNewConversation,
    renameConversation,
    removeConversation,
    updateConversation,
  } = useConversationsDispatch();

  // 未登录时重定向
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [session, authLoading, router]);

  // 使用 useFocusEffect 优化焦点时的操作
  useFocusEffect(
    useCallback(() => {
      // 页面获得焦点时的操作
      return () => {
        // 页面失去焦点时的清理
      };
    }, [])
  );

  // 加载状态
  if (authLoading || conversationsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 未登录不渲染
  if (!session) {
    return null;
  }

  return (
    <IndexPageContent
      currentConversation={currentConversation}
      currentConversationId={currentConversationId}
      conversations={conversations}
      onSelectConversation={selectConversation}
      onCreateNewConversation={createNewConversation}
      onRenameConversation={renameConversation}
      onRemoveConversation={removeConversation}
      onUpdateConversation={updateConversation}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
