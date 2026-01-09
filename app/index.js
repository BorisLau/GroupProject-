import * as DocumentPicker from "expo-document-picker";
import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList";
import Composer from "../components/Composer";
import RenameModal from "../components/RenameModal";
import useConversations from "../hooks/useConversations";
import { colors } from "../styles/theme";

export default function Index() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");

  const {
    conversations,
    currentConversation,
    currentConversationId,
    selectConversation,
    createNewConversation,
    addMessage,
    renameConversation,
  } = useConversations();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [session, authLoading, router]);

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

  const handleSend = () => {
    if (!inputText.trim() && !attachedFileName) {
      return;
    }

    addMessage(inputText, attachedFileName);
    setInputText("");
    setAttachedFileName("");

    // Navigate to mind map editor
    router.push("/mindmap");
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();

      if (!result) {
        return;
      }

      if ("canceled" in result && result.canceled) {
        return;
      }

      const file = Array.isArray(result.assets) ? result.assets[0] : result;

      if (file && (file.name || file.uri)) {
        setAttachedFileName(file.name || "已選擇檔案");
      }
    } catch (error) {
      console.warn("選擇檔案時發生錯誤：", error);
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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.root}>
          <Header
            onMenuPress={toggleSidebar}
            showSignOut={true}
            onSignOut={handleSignOut}
          />

          <MessageList
            messages={currentConversation ? currentConversation.messages : []}
          />

          <Sidebar
            isOpen={isSidebarOpen}
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onLongPressConversation={handleLongPressConversation}
            onNewConversation={handleNewConversation}
            onClose={() => setIsSidebarOpen(false)}
          />

          <Composer
            inputText={inputText}
            onChangeText={setInputText}
            attachedFileName={attachedFileName}
            onAttachFile={handleAttachFile}
            onSend={handleSend}
          />

          <RenameModal
            visible={!!renameTargetId}
            title={renameTitle}
            onChangeTitle={setRenameTitle}
            onCancel={handleRenameCancel}
            onSave={handleRenameSave}
          />
        </View>
      </KeyboardAvoidingView>
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
