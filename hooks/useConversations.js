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
const ConversationsDispatchContext = createContext(null);

const SAVE_DEBOUNCE_MS = 700;
const SAVE_RETRY_DELAY_MS = 2000;

// ============ 工具函数 ============

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
  normalizeConversationRecord({ id, title }, title);

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

// ============ Provider ============

export function ConversationsProvider({ children }) {
  const { session, loading: authLoading } = useAuth();
  
  // 使用 useMemo 缓存初始状态
  const initialState = useMemo(() => createInitialConversationState(), []);
  
  // 状态
  const [conversations, setConversations] = useState(initialState.conversations);
  const [currentConversationId, setCurrentConversationId] = useState(
    initialState.currentConversationId
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs
  const conversationsRef = useRef(initialState.conversations);
  const dirtyConversationIdsRef = useRef(new Set());
  const saveTimeoutRef = useRef(null);
  const hasHydratedRef = useRef(false);
  const flushDirtyConversationsRef = useRef(async () => {});

  const userId = session?.user?.id || null;

  // 同步 ref
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // 计算当前对话 - 使用 useMemo 缓存
  const currentConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === currentConversationId
      ) || conversations[0] || null,
    [conversations, currentConversationId]
  );

  // 取消定时保存
  const cancelScheduledSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // 立即保存脏数据
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
      setError({ message: "保存失败", details: error.message });
      dirtyIds.forEach((id) => dirtyConversationIdsRef.current.add(id));
      // 延迟重试
      saveTimeoutRef.current = setTimeout(() => {
        flushDirtyConversationsRef.current();
      }, SAVE_RETRY_DELAY_MS);
    }
  }, [cancelScheduledSave, userId]);

  // 更新 ref
  useEffect(() => {
    flushDirtyConversationsRef.current = flushDirtyConversations;
  }, [flushDirtyConversations]);

  // 定时保存
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

  // 标记脏数据
  const markConversationDirty = useCallback((id) => {
    if (!id || !userId || !hasHydratedRef.current) {
      return;
    }

    dirtyConversationIdsRef.current.add(id);
    scheduleSave();
  }, [scheduleSave, userId]);

  // ============ Actions ============

  const selectConversation = useCallback((id) => {
    setCurrentConversationId(id);
  }, []);

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
    if (!currentConversationId) {
      return;
    }

    updateConversation(currentConversationId, (conversation) => {
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
  }, [currentConversationId, updateConversation]);

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
      setError({ message: "删除失败", details: error.message });
      throw error;
    }

    if (replacementConversation && userId && hasHydratedRef.current) {
      dirtyConversationIdsRef.current.add(replacementConversation.id);
      scheduleSave();
    }
  }, [scheduleSave, userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============ 数据同步 ============

  // 用户登录后加载数据
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

    let isCancelled = false;

    const hydrateTaskRecords = async () => {
      setLoading(true);
      setError(null);

      try {
        const records = await listTaskRecords();

        if (isCancelled) {
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
      } catch (err) {
        console.warn("Failed to load task records:", err);
        if (isCancelled) {
          return;
        }
        setError({ message: "加载数据失败", details: err.message });

        const nextInitialState = createInitialConversationState();
        setConversations(nextInitialState.conversations);
        setCurrentConversationId(nextInitialState.currentConversationId);
        hasHydratedRef.current = true;
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    hydrateTaskRecords();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, cancelScheduledSave, userId]);

  // App 进入后台时保存
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

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      void flushDirtyConversationsRef.current();
      cancelScheduledSave();
    };
  }, [cancelScheduledSave]);

  // ============ Context Values ============

  // 状态值 - 使用 useMemo 缓存
  const stateValue = useMemo(
    () => ({
      loading,
      error,
      conversations,
      currentConversation,
      currentConversationId,
    }),
    [loading, error, conversations, currentConversation, currentConversationId]
  );

  // 操作函数 - 使用 useMemo 缓存，函数引用稳定
  const dispatchValue = useMemo(
    () => ({
      selectConversation,
      createNewConversation,
      addMessage,
      renameConversation,
      removeConversation,
      updateConversation,
      updateCurrentConversation,
      updateCurrentConversationGraph,
      clearError,
    }),
    [
      selectConversation,
      createNewConversation,
      addMessage,
      renameConversation,
      removeConversation,
      updateConversation,
      updateCurrentConversation,
      updateCurrentConversationGraph,
      clearError,
    ]
  );

  return (
    <ConversationsContext.Provider value={stateValue}>
      <ConversationsDispatchContext.Provider value={dispatchValue}>
        {children}
      </ConversationsDispatchContext.Provider>
    </ConversationsContext.Provider>
  );
}

// ============ Hooks ============

/**
 * 获取所有对话状态（慎用，会订阅所有状态变化）
 * @returns {{
 *   loading: boolean,
 *   error: Error|null,
 *   conversations: Array,
 *   currentConversation: Object|null,
 *   currentConversationId: string|null
 * }}
 */
export function useConversationsState() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversationsState must be used within ConversationsProvider");
  }
  return context;
}

/**
 * 获取对话操作函数（不会触发重渲染）
 * @returns {Object}
 */
export function useConversationsDispatch() {
  const context = useContext(ConversationsDispatchContext);
  if (!context) {
    throw new Error("useConversationsDispatch must be used within ConversationsProvider");
  }
  return context;
}

/**
 * 使用 selector 获取特定状态，避免不必要重渲染
 * @template T
 * @param {(state: ReturnType<typeof useConversationsState>) => T} selector
 * @returns {T}
 */
export function useConversationsSelector(selector) {
  const state = useConversationsState();
  return selector(state);
}

/**
 * 兼容旧版本的 hook（组合状态和操作）
 * @returns {ReturnType<typeof useConversationsState> & ReturnType<typeof useConversationsDispatch>}
 */
export default function useConversations() {
  const state = useConversationsState();
  const dispatch = useConversationsDispatch();
  return useMemo(() => ({ ...state, ...dispatch }), [state, dispatch]);
}

/**
 * 仅获取当前对话（优化版本）
 * @returns {Object|null}
 */
export function useCurrentConversation() {
  return useConversationsSelector((state) => state.currentConversation);
}

/**
 * 仅获取对话列表（优化版本）
 * @returns {Array}
 */
export function useConversationsList() {
  return useConversationsSelector((state) => state.conversations);
}

/**
 * 仅获取加载状态
 * @returns {boolean}
 */
export function useConversationsLoading() {
  return useConversationsSelector((state) => state.loading);
}
