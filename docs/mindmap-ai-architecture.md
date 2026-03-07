# Mindmap AI 架構（技術無關）

## 目標
- 讓任何 AI/LLM 都能用一致的工具協議輸出 mindmap。
- 前端渲染層可替換（Canvas / React Flow / MindElixir / 其他）而不改核心資料模型。
- 支援後續擴充：自動分類、關係推理、碰撞排版、同步儲存。

## 參考的大型項目模式（Context7）
- Mind Elixir：節點資料模型 + operation guards + event bus。
- tldraw：資料與行為分離（record/store vs util/tool）、可插拔 shape/tool。
- LangGraph：tool-calling 工作流（agent -> tool -> validate -> loop）。

## 架構分層
1. Canonical Domain Model（核心圖模型）
   - `version/meta/nodes/edges`
   - 與 UI 框架解耦。
2. Generation Pipeline（AI 生成管線）
   - `prepare request -> call model/tools -> normalize -> validate -> layout -> adapt`
3. Classification Layer（節點/關係分類）
   - node type taxonomy、relation allow-list、關鍵詞規則。
4. Layout Layer（排版）
   - 樹狀分支左右展開 + 尺寸估計 + 去重。
5. Adapter Layer（平台轉接）
   - Canonical Graph <-> Canvas Graph（或其他引擎）。

## 分類（可擴充）
- Node Types:
  - `root/concept/question/task/decision/resource/risk/note/milestone/group`
- Relation Types:
  - `parent/depends_on/supports/blocks/references/next`

## AI Tool 契約（建議）
- `generate_outline(topic, context, constraints)`
- `expand_branch(nodeId, nodeLabel, depth)`
- `link_cross_dependencies(nodes)`
- `lint_graph(graph)`

## 專案對應檔案
- `src/features/mindmap/ai/mindmapSchema.js`
- `src/features/mindmap/ai/classification.js`
- `src/features/mindmap/ai/toolContracts.js`
- `src/features/mindmap/ai/layoutEngine.js`
- `src/features/mindmap/ai/graphAdapters.js`
- `src/features/mindmap/ai/generationPipeline.js`

## 建議接入流程
1. UI 送出 `topic/context/maxNodes`。
2. `prepareMindmapGenerationRequest` 產生 system prompt + tool spec。
3. LLM 回傳 graph JSON（或多輪工具結果）。
4. `finalizeGeneratedMindmap` 做 normalize/validate/layout。
5. 轉為 Canvas graph，渲染並儲存（Supabase/local）。

## 風險控制
- Schema 驗證阻擋壞資料（空節點、壞 edge、自循環）。
- 節點上限限制避免一次生成過大圖。
- 類型/關係白名單避免失控結構。

