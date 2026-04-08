import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import UploadCenterPanel from "../components/UploadCenterPanel";
import RenameModal from "../components/RenameModal";
import useConversations from "../hooks/useConversations";
import { finalizeGeneratedMindmap } from "../src/features/mindmap/ai/generationPipeline";
import {
  getBackendBaseUrl,
  getOpenRouterKeyStatus,
  generateMindmap,
} from "../lib/backendApi";
import { colors } from "../styles/theme";

export default function Index() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [isCheckingOpenRouterKey, setIsCheckingOpenRouterKey] = useState(true);
  const [openRouterStatusMessage, setOpenRouterStatusMessage] = useState("");
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");

  const {
    loading: conversationsLoading,
    conversations,
    currentConversation,
    currentConversationId,
    selectConversation,
    createNewConversation,
    renameConversation,
    removeConversation,
    updateConversation,
  } = useConversations();

  const attachedFileName = currentConversation?.selectedFileName || "";
  const isGenerating = Boolean(currentConversation?.isGenerating);
  const generationStatus = currentConversation?.generationStatus || "";
  const panelStatusText = generationStatus || openRouterStatusMessage;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [session, authLoading, router]);

  const loadOpenRouterKeyStatus = useCallback(async () => {
    if (!session?.access_token) {
      const message = "尚未登入，暫時無法檢查 OpenRouter API Key 狀態。";
      setHasOpenRouterKey(false);
      setIsCheckingOpenRouterKey(false);
      setOpenRouterStatusMessage(message);
      return {
        hasKey: false,
        statusMessage: message,
      };
    }

    setIsCheckingOpenRouterKey(true);

    try {
      const result = await getOpenRouterKeyStatus({ token: session.access_token });
      const hasKey = Boolean(result?.has_key);
      const statusMessage = hasKey
        ? ""
        : "尚未設定 OpenRouter API Key。需要生成 mindmap 時，可到設定頁手動輸入。";
      setHasOpenRouterKey(hasKey);
      setOpenRouterStatusMessage(statusMessage);
      return {
        hasKey,
        statusMessage,
      };
    } catch (error) {
      const statusMessage =
        error?.message ||
        `無法確認 OpenRouter API Key 狀態。請檢查後端是否可連線：${getBackendBaseUrl()}`;
      setHasOpenRouterKey(false);
      setOpenRouterStatusMessage(statusMessage);
      return {
        hasKey: false,
        statusMessage,
      };
    } finally {
      setIsCheckingOpenRouterKey(false);
    }
  }, [session?.access_token]);

  useFocusEffect(useCallback(() => {
    loadOpenRouterKeyStatus();
    return undefined;
  }, [loadOpenRouterKeyStatus]));

  // Show loading screen while checking auth
  if (authLoading || conversationsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSelectConversation = (id) => {
    selectConversation(id);
    setIsSidebarOpen(false);
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  const handleAttachFile = async () => {
    const targetConversationId = currentConversationId;

    if (isGenerating) {
      return;
    }

    if (!targetConversationId) {
      return;
    }

    if (!session?.access_token) {
      updateConversation(targetConversationId, {
        generationStatus: "尚未登入，無法呼叫後端生成。",
      });
      return;
    }

    try {
      const { hasKey, statusMessage } = await loadOpenRouterKeyStatus();

      if (!hasKey) {
        const message =
          statusMessage ||
          "請先到設定頁輸入 OpenRouter API Key，後端才可調用 OpenRouter 生成 mindmap。";
        updateConversation(targetConversationId, {
          generationStatus: message,
        });
        Alert.alert("需要設定 OpenRouter API Key", message, [
          { text: "稍後再說", style: "cancel" },
          { text: "前往設定", onPress: () => router.push("/settings") },
        ]);
        return;
      }
    } catch (error) {
      setHasOpenRouterKey(false);
      const message =
        error?.message ||
        `無法確認 OpenRouter API Key 狀態。請檢查後端是否可連線：${getBackendBaseUrl()}`;
      updateConversation(targetConversationId, {
        generationStatus: message,
      });
      Alert.alert("暫時無法連線到後端", message, [
        { text: "知道了", style: "cancel" },
        { text: "前往設定", onPress: () => router.push("/settings") },
      ]);
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (!result) {
        return;
      }

      if ("canceled" in result && result.canceled) {
        return;
      }

      const file = Array.isArray(result.assets) ? result.assets[0] : result;

      if (file && (file.name || file.uri)) {
        const displayName = file.name || "已選擇檔案";
        updateConversation(targetConversationId, {
          selectedFileName: displayName,
          generationStatus: "AI 生成中...",
          isGenerating: true,
        });

        const result = await generateMindmap({
          token: session.access_token,
          file,
          title: displayName,
          maxNodes: 50,
          language: "zh-TW",
        });

        if (!result?.mindmap_id || !result?.graph_json) {
          updateConversation(targetConversationId, {
            generationStatus: "生成完成，但找不到結果。",
          });
          return;
        }
        const finalizedMindmap = finalizeGeneratedMindmap(result.graph_json, {
          maxNodes: 100,
          worldCenterX: 0,
          worldCenterY: 0,
        });

        if (!finalizedMindmap.ok || !finalizedMindmap.canvasGraph) {
          updateConversation(targetConversationId, {
            generationStatus: "生成完成，但無法轉換成可編輯的 mindmap。",
          });
          return;
        }

        const nodeCount = Array.isArray(result?.graph_json?.nodes)
          ? result.graph_json.nodes.length
          : 0;
        const edgeCount = Array.isArray(result?.graph_json?.edges)
          ? result.graph_json.edges.length
          : 0;

        updateConversation(targetConversationId, (conversation) => ({
          ...conversation,
          mindmapId: result.mindmap_id,
          mindmapGraph: finalizedMindmap.canvasGraph,
          generationStatus: `生成完成：${nodeCount} 個節點、${edgeCount} 條連線。`,
        }));
      }
    } catch (error) {
      console.warn("上傳與生成流程發生錯誤：", error);
      updateConversation(targetConversationId, {
        generationStatus: error.message || "上傳失敗",
      });
    } finally {
      updateConversation(targetConversationId, {
        isGenerating: false,
      });
    }
  };

  const handleRenameConversation = (conversation) => {
    setRenameTargetId(conversation.id);
    setRenameTitle(conversation.title);
  };

  const handleDeleteConversation = (conversation) => {
    if (!conversation?.id) {
      return;
    }

    Alert.alert(
      "刪除任務",
      `確定要刪除「${conversation.title}」嗎？`,
      [
        {
          text: "取消",
          style: "cancel",
        },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              await removeConversation(conversation.id);
            } catch (error) {
              Alert.alert("刪除失敗", error?.message || "無法刪除任務，請稍後再試。");
            }
          },
        },
      ]
    );
  };

  const handleRenameCancel = () => {
    setRenameTargetId(null);
    setRenameTitle("");
  };

  const handleRenameSave = () => {
    if (!renameTargetId) {
      return;
    }

    const trimmed = renameTitle.trim();
    if (!trimmed) {
      handleRenameCancel();
      return;
    }

    renameConversation(renameTargetId, trimmed);
    handleRenameCancel();
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      router.replace("/login");
    }
  };

  const handleOpenCanvas = () => {
    router.push("/canvas");
  };

  const handleOpenSettings = () => {
    setIsSidebarOpen(false);
    router.push("/settings");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.root}>
        <Header
          onMenuPress={toggleSidebar}
          onCanvasPress={handleOpenCanvas}
          showSignOut={true}
          onSignOut={handleSignOut}
        />

        <UploadCenterPanel
          onUploadPress={handleAttachFile}
          selectedFileName={attachedFileName}
          isBusy={isGenerating}
          statusText={panelStatusText}
          hasApiKey={hasOpenRouterKey}
          isCheckingApiKey={isCheckingOpenRouterKey}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onNewConversation={handleNewConversation}
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
