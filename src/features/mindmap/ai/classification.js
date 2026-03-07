import { NODE_TYPES, RELATION_TYPES } from "./constants";

export const NODE_TYPE_CATALOG = {
  root: {
    label: "主題",
    description: "整張 mindmap 的主問題或主題。",
  },
  concept: {
    label: "概念",
    description: "核心知識點或子主題。",
  },
  question: {
    label: "問題",
    description: "待釐清問題或研究問題。",
  },
  task: {
    label: "任務",
    description: "可執行步驟與工作項目。",
  },
  decision: {
    label: "決策",
    description: "方案選擇與判斷點。",
  },
  resource: {
    label: "資源",
    description: "工具、文件、參考資料。",
  },
  risk: {
    label: "風險",
    description: "風險與限制條件。",
  },
  note: {
    label: "備註",
    description: "輔助說明與背景資訊。",
  },
  milestone: {
    label: "里程碑",
    description: "階段性目標與驗收節點。",
  },
  group: {
    label: "分組",
    description: "群組節點，用於分類而非具體內容。",
  },
};

const KEYWORD_RULES = [
  { type: "task", patterns: ["todo", "task", "實作", "步驟", "行動", "執行"] },
  { type: "decision", patterns: ["選擇", "決策", "取捨", "方案", "option"] },
  { type: "question", patterns: ["why", "how", "what", "問題", "為何", "如何"] },
  { type: "resource", patterns: ["參考", "doc", "文件", "tool", "資源"] },
  { type: "risk", patterns: ["risk", "限制", "風險", "阻礙", "問題點"] },
  { type: "milestone", patterns: ["milestone", "階段", "里程碑", "deadline"] },
];

const RELATION_ALLOW_LIST = {
  parent: new Set(NODE_TYPES),
  depends_on: new Set(["task", "milestone", "decision"]),
  supports: new Set(["resource", "note", "concept", "task"]),
  blocks: new Set(["risk", "task", "decision"]),
  references: new Set(NODE_TYPES),
  next: new Set(["task", "milestone"]),
};

export const suggestNodeType = (label, fallbackType = "concept") => {
  const text = String(label || "").toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) {
      return rule.type;
    }
  }
  return NODE_TYPES.includes(fallbackType) ? fallbackType : "concept";
};

export const normalizeNodeType = (type, label, fallbackType = "concept") => {
  const candidate = String(type || "").toLowerCase();
  if (NODE_TYPES.includes(candidate)) {
    return candidate;
  }
  return suggestNodeType(label, fallbackType);
};

export const normalizeRelationType = (relation, fromType = "concept") => {
  const candidate = String(relation || "").toLowerCase();
  if (RELATION_TYPES.includes(candidate) && isRelationAllowed(fromType, candidate)) {
    return candidate;
  }
  return "parent";
};

export const isRelationAllowed = (fromType, relation) => {
  const allowedNodeTypes = RELATION_ALLOW_LIST[relation];
  if (!allowedNodeTypes) {
    return false;
  }
  return allowedNodeTypes.has(fromType);
};

