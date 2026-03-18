import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteTaskRecord,
  listTaskRecords,
  upsertTaskRecords,
} from "../lib/taskRecordsApi";
import { createEmptyCanvasGraph } from "../src/features/mindmap/canvasGraph";

const ConversationsContext = createContext(null);
const SAVE_DEBOUNCE_MS = 700;
const SAVE_RETRY_DELAY_MS = 2000;

const createConversationId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

const buildConversationTitle = (index) =>
  index <= 1 ? "新的任務" : `新的任務 ${index}`;

const normalizeTitle = (title, fallbackTitle = buildConversationTitle(1)) => {
  if (typeof title !== "string") {
    return fallbackTitle;
  }

  const nextTitle = title.trim();
  return nextTitle || fallbackTitle;
};

const normalizeMindmapGraph = (graph, title) => {
  const fallbackGraph = createEmptyCanvasGraph({ title });
  if (!graph || typeof graph !== "object") {
    return fallbackGraph;
  }

  return {
    ...fallbackGraph,
    ...graph,
    meta: {
      ...fallbackGraph.meta,
      ...(graph.meta || {}),
      title,
    },
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  };
};

const normalizeConversationRecord = (conversation, fallbackTitle) => {
  const title = normalizeTitle(conversation?.title, fallbackTitle);

  return {
    id: conversation?.id || createConversationId(),
    title,
    messages: Array.isArray(conversation?.messages) ? conversation.messages : [],
    mindmapGraph: normalizeMindmapGraph(conversation?.mindmapGraph, title),
    selectedFileName:
      typeof conversation?.selectedFileName === "string"
        ? conversation.selectedFileName
        : "",
    generationStatus:
      typeof conversation?.generationStatus === "string"
        ? conversation.generationStatus
        : "",
    isGenerating: Boolean(conversation?.isGenerating),
    mindmapId: conversation?.mindmapId || null,
  };
};

const createConversationRecord = ({ id, title }) =>
  normalizeConversationRecord(
    {
      id,
      title,
    },
    title
  );

const createInitialConversationState = () => {
  const initialId = createConversationId();
  const initialConversation = createConversationRecord({
    id: initialId,
    title: buildConversationTitle(1),
  });

  return {
    conversations: [initialConversation],
    currentConversationId: initialId,
  };
};

const applyConversationUpdate = (conversation, updater) => {
  let nextConversation = conversation;

  if (typeof updater === "function") {
    nextConversation = updater(conversation);
  }
  if (updater && typeof updater === "object") {
    nextConversation = {
      ...conversation,
      ...updater,
    };
  }

  return normalizeConversationRecord(
    nextConversation,
    normalizeTitle(conversation?.title, buildConversationTitle(1))
  );
};

export function ConversationsProvider({ children }) {
  const { session, loading: authLoading } = useAuth();
  const initialState = useMemo(() => createInitialConversationState(), []);
  const [conversations, setConversations] = useState(initialState.conversations);
  const [currentConversationId, setCurrentConversationId] = useState(
    initialState.currentConversationId
  );
  const [loading, setLoading] = useState(true);
  const conversationsRef = useRef(initialState.conversations);
  const dirtyConversationIdsRef = useRef(new Set());
  const saveTimeoutRef = useRef(null);
  const hasHydratedRef = useRef(false);
  const flushDirtyConversationsRef = useRef(async () => {});
  const userId = session?.user?.id || null;

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const currentConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === currentConversationId
      ) || conversations[0] || null,
    [conversations, currentConversationId]
  );

  const selectConversation = useCallback((id) => {
    setCurrentConversationId(id);
  }, []);

  const cancelScheduledSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback((delayMs = SAVE_DEBOUNCE_MS) => {
    if (!userId || !hasHydratedRef.current) {
      return;
    }

    cancelScheduledSave();
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      void flushDirtyConversationsRef.current();
    }, delayMs);
  }, [cancelScheduledSave, userId]);

  const flushDirtyConversations = useCallback(async () => {
    cancelScheduledSave();

    if (!userId || !hasHydratedRef.current) {
      return;
    }

    const dirtyIds = Array.from(dirtyConversationIdsRef.current);
    dirtyConversationIdsRef.current.clear();

    if (dirtyIds.length === 0) {
      return;
    }

    const dirtyIdSet = new Set(dirtyIds);
    const records = conversationsRef.current
      .filter((conversation) => dirtyIdSet.has(conversation.id))
      .map((conversation) => ({
        id: conversation.id,
        user_id: userId,
        title: conversation.title,
        mindmap_graph: normalizeMindmapGraph(
          conversation.mindmapGraph,
          conversation.title
        ),
        selected_file_name: conversation.selectedFileName || "",
        generation_status: conversation.generationStatus || "",
        is_generating: Boolean(conversation.isGenerating),
        source_mindmap_id: conversation.mindmapId || null,
      }));

    if (records.length === 0) {
      return;
    }

    try {
      await upsertTaskRecords({ records });
    } catch (error) {
      console.warn("Failed to persist task records:", error);
      dirtyIds.forEach((id) => dirtyConversationIdsRef.current.add(id));
      scheduleSave(SAVE_RETRY_DELAY_MS);
    }
  }, [cancelScheduledSave, scheduleSave, userId]);

  useEffect(() => {
    flushDirtyConversationsRef.current = flushDirtyConversations;
  }, [flushDirtyConversations]);

  const markConversationDirty = useCallback((id) => {
    if (!id || !userId || !hasHydratedRef.current) {
      return;
    }

    dirtyConversationIdsRef.current.add(id);
    scheduleSave();
  }, [scheduleSave, userId]);

  const updateConversation = useCallback((id, updater, options = {}) => {
    if (!id) {
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? applyConversationUpdate(conversation, updater)
          : conversation
      )
    );

    if (!options.skipPersist) {
      markConversationDirty(id);
    }
  }, [markConversationDirty]);

  const updateCurrentConversation = useCallback((updater) => {
    if (!currentConversationId) {
      return;
    }

    updateConversation(currentConversationId, updater);
  }, [currentConversationId, updateConversation]);

  const updateCurrentConversationGraph = useCallback((nextGraphOrUpdater) => {
    if (!currentConversationId) {
      return;
    }

    updateConversation(currentConversationId, (conversation) => {
      const previousGraph =
        conversation.mindmapGraph ||
        createEmptyCanvasGraph({ title: conversation.title });
      const nextGraph =
        typeof nextGraphOrUpdater === "function"
          ? nextGraphOrUpdater(previousGraph)
          : nextGraphOrUpdater;

      return {
        ...conversation,
        mindmapGraph: normalizeMindmapGraph(nextGraph, conversation.title),
      };
    });
  }, [currentConversationId, updateConversation]);

  const createNewConversation = useCallback(() => {
    const newId = createConversationId();

    setConversations((prev) => {
      const title = buildConversationTitle(prev.length + 1);
      const newConversation = createConversationRecord({
        id: newId,
        title,
      });
      return [newConversation, ...prev];
    });

    setCurrentConversationId(newId);
    markConversationDirty(newId);
  }, [markConversationDirty]);

  const addMessage = useCallback((text, fileName = "") => {
    updateCurrentConversation((conversation) => {
      const userMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        text: text.trim(),
        fileName,
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
    });
  }, [updateCurrentConversation]);

  const renameConversation = useCallback((id, newTitle) => {
    updateConversation(id, (conversation) => ({
      ...conversation,
      title: normalizeTitle(newTitle, conversation.title),
      mindmapGraph: normalizeMindmapGraph(
        conversation.mindmapGraph,
        normalizeTitle(newTitle, conversation.title)
      ),
    }));
  }, [updateConversation]);

  const removeConversation = useCallback(async (id) => {
    if (!id) {
      return;
    }

    let replacementConversation = null;

    setConversations((prev) => {
      const nextConversations = prev.filter((conversation) => conversation.id !== id);

      if (nextConversations.length > 0) {
        replacementConversation = nextConversations[0];
        return nextConversations;
      }

      replacementConversation = createConversationRecord({
        id: createConversationId(),
        title: buildConversationTitle(1),
      });

      return [replacementConversation];
    });

    setCurrentConversationId((prevCurrentConversationId) => {
      if (prevCurrentConversationId !== id) {
        return prevCurrentConversationId;
      }

      return replacementConversation?.id || null;
    });

    dirtyConversationIdsRef.current.delete(id);

    try {
      if (userId) {
        await deleteTaskRecord({ id });
      }
    } catch (error) {
      console.warn("Failed to delete task record:", error);
      throw error;
    }

    if (replacementConversation && userId && hasHydratedRef.current) {
      dirtyConversationIdsRef.current.add(replacementConversation.id);
      scheduleSave();
    }
  }, [scheduleSave, userId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      const nextInitialState = createInitialConversationState();
      hasHydratedRef.current = false;
      dirtyConversationIdsRef.current.clear();
      cancelScheduledSave();
      setConversations(nextInitialState.conversations);
      setCurrentConversationId(nextInitialState.currentConversationId);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const hydrateTaskRecords = async () => {
      setLoading(true);

      try {
        const records = await listTaskRecords();

        if (cancelled) {
          return;
        }

        if (records.length === 0) {
          const nextInitialState = createInitialConversationState();
          const initialConversation = nextInitialState.conversations[0];
          setConversations(nextInitialState.conversations);
          setCurrentConversationId(nextInitialState.currentConversationId);
          hasHydratedRef.current = true;
          await upsertTaskRecords({
            records: [
              {
                id: initialConversation.id,
                user_id: userId,
                title: initialConversation.title,
                mindmap_graph: initialConversation.mindmapGraph,
                selected_file_name: "",
                generation_status: "",
                is_generating: false,
                source_mindmap_id: null,
              },
            ],
          });
          return;
        }

        const hydratedConversations = records.map((record) =>
          normalizeConversationRecord(
            {
              id: record.id,
              title: record.title,
              mindmapGraph: record.mindmap_graph,
              selectedFileName: record.selected_file_name,
              generationStatus: record.generation_status,
              isGenerating: record.is_generating,
              mindmapId: record.source_mindmap_id,
            },
            buildConversationTitle(1)
          )
        );

        setConversations(hydratedConversations);
        setCurrentConversationId(hydratedConversations[0]?.id || null);
        hasHydratedRef.current = true;
      } catch (error) {
        console.warn("Failed to load task records:", error);
        if (cancelled) {
          return;
        }

        const nextInitialState = createInitialConversationState();
        setConversations(nextInitialState.conversations);
        setCurrentConversationId(nextInitialState.currentConversationId);
        hasHydratedRef.current = true;
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    hydrateTaskRecords();

    return () => {
      cancelled = true;
    };
  }, [authLoading, cancelScheduledSave, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        void flushDirtyConversationsRef.current();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      void flushDirtyConversationsRef.current();
      cancelScheduledSave();
    };
  }, [cancelScheduledSave]);

  const value = useMemo(
    () => ({
      loading,
      conversations,
      currentConversation,
      currentConversationId,
      selectConversation,
      createNewConversation,
      addMessage,
      renameConversation,
      removeConversation,
      updateConversation,
      updateCurrentConversation,
      updateCurrentConversationGraph,
    }),
    [
      loading,
      conversations,
      currentConversation,
      currentConversationId,
      selectConversation,
      createNewConversation,
      addMessage,
      renameConversation,
      removeConversation,
      updateConversation,
      updateCurrentConversation,
      updateCurrentConversationGraph,
    ]
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export default function useConversations() {
  const context = useContext(ConversationsContext);

  if (!context) {
    throw new Error("useConversations must be used within a ConversationsProvider");
  }

  return context;
}
