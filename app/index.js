import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
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
import {
  createMindmapJob,
  getDeepSeekKeyStatus,
  getMindmapById,
  getMindmapJob,
} from "../lib/backendApi";
import { colors } from "../styles/theme";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_POLL_ATTEMPTS = 90;

export default function Index() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [hasDeepSeekKey, setHasDeepSeekKey] = useState(false);
  const [isCheckingDeepSeekKey, setIsCheckingDeepSeekKey] = useState(true);
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");

  const {
    conversations,
    currentConversationId,
    selectConversation,
    createNewConversation,
    renameConversation,
  } = useConversations();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [session, authLoading, router]);

  const loadDeepSeekKeyStatus = useCallback(async () => {
    if (!session?.access_token) {
      setHasDeepSeekKey(false);
      setIsCheckingDeepSeekKey(false);
      return false;
    }

    setIsCheckingDeepSeekKey(true);

    try {
      const result = await getDeepSeekKeyStatus({ token: session.access_token });
      const hasKey = Boolean(result?.has_key);
      setHasDeepSeekKey(hasKey);
      return hasKey;
    } catch (_error) {
      setHasDeepSeekKey(false);
      return false;
    } finally {
      setIsCheckingDeepSeekKey(false);
    }
  }, [session?.access_token]);

  useFocusEffect(useCallback(() => {
    loadDeepSeekKeyStatus();
    return undefined;
  }, [loadDeepSeekKeyStatus]));

  useEffect(() => {
    if (!session?.access_token) {
      setGenerationStatus("");
    }
  }, [session?.access_token]);

  // Show loading screen while checking auth
  if (authLoading) {
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

  const pollJobUntilFinished = async (jobId, token) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const job = await getMindmapJob({ token, jobId });
      if (job.status === "succeeded" || job.status === "failed") {
        return job;
      }
      await sleep(2000);
    }

    throw new Error("等待 AI 生成逾時，請稍後再試。");
  };

  const handleAttachFile = async () => {
    if (isGenerating) {
      return;
    }

    if (!session?.access_token) {
      setGenerationStatus("尚未登入，無法呼叫後端生成。");
      return;
    }

    try {
      const hasKey = await loadDeepSeekKeyStatus();

      if (!hasKey) {
        setGenerationStatus("請先到設定頁輸入 DeepSeek API Key，後端才可調用 DeepSeek 生成 mindmap。");
        router.push("/settings");
        return;
      }
    } catch (_error) {
      setHasDeepSeekKey(false);
      setGenerationStatus("無法確認 DeepSeek API Key 狀態，請先到設定頁檢查。");
      router.push("/settings");
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
        setAttachedFileName(displayName);
        setGenerationStatus("建立 AI 任務中...");
        setIsGenerating(true);

        const createResult = await createMindmapJob({
          token: session.access_token,
          file,
          title: displayName,
          maxNodes: 50,
          language: "zh-TW",
        });

        setGenerationStatus("任務已送出，AI 生成中...");
        const finalJob = await pollJobUntilFinished(createResult.job_id, session.access_token);

        if (finalJob.status === "failed") {
          setGenerationStatus(finalJob.error || "生成失敗，請稍後重試。");
          return;
        }

        if (!finalJob.mindmap_id) {
          setGenerationStatus("生成完成，但找不到結果。");
          return;
        }

        const mindmap = await getMindmapById({
          token: session.access_token,
          mindmapId: finalJob.mindmap_id,
        });
        const nodeCount = Array.isArray(mindmap?.graph_json?.nodes)
          ? mindmap.graph_json.nodes.length
          : 0;
        const edgeCount = Array.isArray(mindmap?.graph_json?.edges)
          ? mindmap.graph_json.edges.length
          : 0;

        setGenerationStatus(`生成完成：${nodeCount} 個節點、${edgeCount} 條連線。`);
      }
    } catch (error) {
      console.warn("上傳與生成流程發生錯誤：", error);
      setGenerationStatus(error.message || "上傳失敗");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLongPressConversation = (conversation) => {
    setRenameTargetId(conversation.id);
    setRenameTitle(conversation.title);
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
          statusText={generationStatus}
          hasApiKey={hasDeepSeekKey}
          isCheckingApiKey={isCheckingDeepSeekKey}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onLongPressConversation={handleLongPressConversation}
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
