import { useState } from "react";

export default function useConversations() {
  const [conversations, setConversations] = useState([
    { id: "1", title: "新的聊天", messages: [] },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState("1");

  const currentConversation = conversations.find(
    (conversation) => conversation.id === currentConversationId
  );

  const selectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const createNewConversation = () => {
    const newId = (conversations.length + 1).toString();
    const newConversation = {
      id: newId,
      title: `新的聊天 ${newId}`,
      messages: [],
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newId);
  };

  const addMessage = (text, fileName = "") => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== currentConversationId) {
          return conversation;
        }

        const userMessage = {
          id: `${Date.now()}-user`,
          role: "user",
          text: text.trim(),
          fileName: fileName,
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
  };

  const renameConversation = (id, newTitle) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? { ...conversation, title: newTitle }
          : conversation
      )
    );
  };

  return {
    conversations,
    currentConversation,
    currentConversationId,
    selectConversation,
    createNewConversation,
    addMessage,
    renameConversation,
  };
}
