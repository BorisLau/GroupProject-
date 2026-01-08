import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([
    { id: "1", title: "新的聊天", messages: [] },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState("1");
  const [inputText, setInputText] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");

  const currentConversation = conversations.find(
    (conversation) => conversation.id === currentConversationId
  );

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false);
  };

  const handleNewConversation = () => {
    const newId = (conversations.length + 1).toString();
    const newConversation = {
      id: newId,
      title: `新的聊天 ${newId}`,
      messages: [],
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newId);
  };

  const handleSend = () => {
    if (!inputText.trim() && !attachedFileName) {
          return;
        }

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== currentConversationId) {
          return conversation;
        }

        const userMessage = {
          id: `${Date.now()}-user`,
          role: "user",
          text: inputText.trim(),
          fileName: attachedFileName || "",
        };

        const aiMessage = {
          id: `${Date.now()}-ai`,
          role: "assistant",
          text: "這裡顯示 AI 的回覆內容（示意）。",
          fileName: "",
        };

        return {
          ...conversation,
          messages: [...conversation.messages, userMessage, aiMessage],
        };
      })
    );

    setInputText("");
    setAttachedFileName("");
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

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === renameTargetId
          ? { ...conversation, title: trimmed }
          : conversation
      )
    );

    handleRenameCancel();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.root}>
      <View style={styles.header}>
          <Text style={styles.headerTitle}>Smart Map</Text>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.chatScroll}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
        >
          {currentConversation && currentConversation.messages.length === 0 && (
            <View style={styles.emptyState}></View>
          )}

          {currentConversation &&
            currentConversation.messages.map((message) => (
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
                  <Text style={styles.fileNameText}>
                    📎 {message.fileName}
                  </Text>
                ) : null}
                {message.text ? (
                  <Text style={styles.messageText}>{message.text}</Text>
                ) : null}
              </View>
            ))}
        </ScrollView>

        {isSidebarOpen && (
          <View style={styles.sidebarOverlay}>
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
                    onPress={() => handleSelectConversation(conversation.id)}
                    onLongPress={() => handleLongPressConversation(conversation)}
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
                onPress={handleNewConversation}
              >
                <Text style={styles.newChatButtonText}>+ 新的聊天</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.inputWrapper}>
          <View style={styles.inputInner}>
            <ScrollView
              style={styles.inputScroll}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                placeholder="輸入製作mindmap的資料..."
                value={inputText}
                onChangeText={setInputText}
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
                onPress={handleAttachFile}
              >
                <Text style={styles.attachButtonText}>上傳檔案</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <Text style={styles.sendButtonText}>發送</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {renameTargetId && (
          <View style={styles.renameOverlay}>
            <View style={styles.renameContainer}>
              <Text style={styles.renameTitle}>修改聊天名稱</Text>
            <TextInput
                value={renameTitle}
                onChangeText={setRenameTitle}
                placeholder="輸入新的聊天名稱"
                style={styles.renameInput}
              />
              <View style={styles.renameButtonsRow}>
            <TouchableOpacity
                  style={styles.renameCancelButton}
                  onPress={handleRenameCancel}
            >
                  <Text style={styles.renameCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.renameSaveButton}
                  onPress={handleRenameSave}
                >
                  <Text style={styles.renameSaveText}>儲存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffffff",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333333",
  },
  menuButton: {
    width: 28,
    height: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuLine: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "#666666",
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    marginBottom: 180,
  },
  messagesContainer: {
    paddingBottom: 24,
  },
  emptyState: {
    marginTop: 32,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#555555",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#777777",
    textAlign: "center",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#007aff",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e5ea",
  },
  messageText: {
    fontSize: 15,
    color: "#000000",
  },
  fileNameText: {
    fontSize: 13,
    marginBottom: 4,
    color: "#333333",
  },
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    flexDirection: "row",
    zIndex: 10,
  },
  sidebar: {
    width: 260,
    backgroundColor: "#ffffff",
    paddingTop: 60,
    paddingHorizontal: 12,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333333",
  },
  sidebarList: {
    flex: 1,
  },
  sidebarItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  sidebarItemActive: {
    backgroundColor: "#e0e0e0",
  },
  sidebarItemText: {
    fontSize: 14,
    color: "#333333",
  },
  sidebarItemTextActive: {
    fontWeight: "600",
    color: "#333333",
  },
  newChatButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cccccc",
    alignItems: "center",
  },
  newChatButtonText: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
  },
  inputWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  inputInner: {
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  inputScroll: {
    maxHeight: 90,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 6,
  },
  attachedFileLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#555555",
  },
  inputActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attachButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#999999",
  },
  attachButtonText: {
    fontSize: 14,
    color: "#555555",
  },
  sendButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#555555",
  },
  sendButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
  },
  renameOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  renameContainer: {
    width: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
  renameInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  renameButtonsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  renameCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  renameSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#555555",
  },
  renameCancelText: {
    fontSize: 14,
    color: "#333333",
  },
  renameSaveText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
  },
});

