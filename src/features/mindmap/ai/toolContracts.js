export const DEFAULT_MINDMAP_POLICY = {
  maxNodes: 50,
  maxDepth: 5,
  maxChildrenPerNode: 8,
  language: "zh-TW",
};

export const MINDMAP_TOOL_SPECS = [
  {
    name: "generate_outline",
    description: "根據主題產生 mindmap 大綱（樹狀節點）。",
    inputSchema: {
      type: "object",
      required: ["topic"],
      properties: {
        topic: { type: "string" },
        context: { type: "string" },
        constraints: { type: "object" },
      },
    },
  },
  {
    name: "expand_branch",
    description: "擴充指定節點分支，補足任務、風險、資源。",
    inputSchema: {
      type: "object",
      required: ["nodeId", "nodeLabel"],
      properties: {
        nodeId: { type: "string" },
        nodeLabel: { type: "string" },
        depth: { type: "number" },
      },
    },
  },
  {
    name: "link_cross_dependencies",
    description: "補上跨分支關係，例如 depends_on / blocks / supports。",
    inputSchema: {
      type: "object",
      required: ["nodes"],
      properties: {
        nodes: { type: "array" },
      },
    },
  },
  {
    name: "lint_graph",
    description: "檢查孤兒節點、重複概念、衝突關係並給修正建議。",
    inputSchema: {
      type: "object",
      required: ["graph"],
      properties: {
        graph: { type: "object" },
      },
    },
  },
];

export const buildMindmapSystemPrompt = (request, policy = DEFAULT_MINDMAP_POLICY) => {
  const topic = request?.topic || "Untitled";
  const context = request?.context || "";
  const language = request?.language || policy.language;
  const maxNodes = request?.maxNodes || policy.maxNodes;
  const maxDepth = request?.maxDepth || policy.maxDepth;

  return [
    "你是 Mindmap Graph Planner。",
    "輸出必須是可機器解析 JSON，不得輸出 markdown。",
    "先產生清晰樹狀骨架，再補跨分支依賴。",
    "若內容足夠，優先做三層分類：root 主題 -> 2 到 6 個中層分類 -> 具體細節節點。",
    "語意相關的內容應盡量收斂到同一個中層分類下，不要讓 root 直接掛太多雜亂節點。",
    "中層分類可使用 type=group；如果暫時不建立 group 節點，至少在節點上標記 group 名稱。",
    "如果原始內容太短，不要硬湊三層，保持結構自然即可。",
    `語言: ${language}`,
    `節點上限: ${maxNodes}`,
    `深度上限: ${maxDepth}`,
    `主題: ${topic}`,
    context ? `背景: ${context}` : "",
    "每個節點必須包含: id, label, type, parentId(optional), tags(optional)。",
    "edge 必須包含: id, from, to, relation。",
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildMindmapToolBundle = (request, policy = DEFAULT_MINDMAP_POLICY) => {
  return {
    systemPrompt: buildMindmapSystemPrompt(request, policy),
    tools: MINDMAP_TOOL_SPECS,
    policy: {
      ...policy,
      ...request,
    },
  };
};
