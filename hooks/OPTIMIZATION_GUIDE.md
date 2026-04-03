# 状态管理优化指南

## 🚀 优化概览

### 优化前的问题
| 问题 | 影响 |
|------|------|
| AuthContext value 未缓存 | 每次渲染都触发所有使用 `useAuth` 的组件重渲染 |
| useConversations 过于臃肿 | 533行代码，职责不单一 |
| 没有 selector 支持 | 订阅所有状态，即使只用一个字段也会重渲染 |
| 缺少错误状态管理 | 错误处理分散在各组件中 |

### 优化后的改进
| 改进 | 效果 |
|------|------|
| ✅ useMemo 缓存所有 Context value | 稳定引用，避免不必要重渲染 |
| ✅ 拆分 State 和 Dispatch Context | 操作函数不会触发 UI 重渲染 |
| ✅ Selector 模式支持 | 按需订阅特定状态 |
| ✅ 统一的错误状态管理 | 集中处理，简化组件逻辑 |
| ✅ 专用 hooks | useCurrentConversation, useConversationsList 等 |

---

## 📖 使用指南

### 1. 基础用法（兼容旧代码）

```jsx
import useConversations from "../hooks/useConversations";

function MyComponent() {
  // 这个 hook 现在返回稳定的引用
  const {
    conversations,
    currentConversation,
    loading,
    updateConversation,
    createNewConversation,
  } = useConversations();

  // ...
}
```

### 2. 性能优化用法（推荐）

#### 只订阅特定状态
```jsx
import {
  useCurrentConversation,
  useConversationsDispatch,
} from "../hooks/useConversations";

function ConversationTitle() {
  // 只订阅 currentConversation，conversations 变化不会触发重渲染
  const currentConversation = useCurrentConversation();
  
  // dispatch 永远不会触发重渲染
  const { updateCurrentConversation } = useConversationsDispatch();

  return (
    <TextInput
      value={currentConversation?.title}
      onChangeText={(title) => updateCurrentConversation({ title })}
    />
  );
}
```

#### 使用 Selector 获取计算状态
```jsx
import { useConversationsSelector } from "../hooks/useConversations";

function ConversationCounter() {
  // 只订阅计算后的数量，其他状态变化不会触发重渲染
  const conversationCount = useConversationsSelector(
    (state) => state.conversations.length
  );

  return <Text>共 {conversationCount} 个对话</Text>;
}
```

### 3. Auth 优化用法

```jsx
import { useAuthSelector, useAuth } from "../contexts/AuthContext";

// 只获取特定状态
function UserAvatar() {
  // 只订阅 user，session/loading 变化不会触发重渲染
  const user = useAuthSelector((auth) => auth.user);
  
  return <Avatar url={user?.user_metadata?.avatar_url} />;
}

// 获取错误状态
function LoginForm() {
  const { signIn, error, clearError } = useAuth();
  
  return (
    <View>
      {error && (
        <ErrorMessage message={error.message} onDismiss={clearError} />
      )}
      <Button onPress={() => signIn(email, password)} />
    </View>
  );
}
```

---

## 🎯 性能对比

### 场景：Sidebar 组件显示对话列表

#### 优化前
```jsx
function Sidebar() {
  // 订阅所有状态
  const { conversations, currentConversationId, ...20+ other fields } = useConversations();
  
  // 问题：任何 conversations 中的字段变化都会导致 Sidebar 重渲染
  // 即使只改了某个对话的 generationStatus
}
```

#### 优化后
```jsx
import { memo } from "react";
import { useConversationsSelector, useConversationsDispatch } from "../hooks/useConversations";

const Sidebar = memo(function Sidebar({ isOpen }) {
  // 只订阅需要的字段
  const conversations = useConversationsSelector((s) => s.conversations);
  const currentConversationId = useConversationsSelector((s) => s.currentConversationId);
  
  // dispatch 不会触发重渲染
  const { selectConversation } = useConversationsDispatch();

  // 只有 conversations 或 currentConversationId 变化时才会重渲染
  // generationStatus 变化不会触发 Sidebar 重渲染
});
```

---

## 📁 文件结构

```
contexts/
├── AuthContext.js          # 优化后的 Auth Context
hooks/
├── useConversations.js     # 优化后的 Conversations Hook
│   ├── useConversationsState()    # 获取状态
│   ├── useConversationsDispatch() # 获取操作
│   ├── useConversationsSelector() # Selector 支持
│   ├── useCurrentConversation()   # 只获取当前对话
│   ├── useConversationsList()     # 只获取列表
│   └── useConversationsLoading()  # 只获取加载状态
└── index.js                # 统一导出
```

---

## ⚠️ 迁移注意事项

### 1. 保持兼容
旧代码使用 `useConversations()` 仍然可以正常工作，只是性能没有优化。

### 2. 渐进式优化
可以逐步替换旧代码：
1. 先更新高频渲染的组件（Sidebar, Canvas 等）
2. 再更新普通页面组件
3. 最后删除兼容性代码

### 3. 避免在 render 中创建新函数
```jsx
// ❌ 错误：每次渲染都创建新函数
<FlatList
  data={conversations}
  renderItem={({ item }) => <ConversationItem conversation={item} />}
/>

// ✅ 正确：使用 useCallback 或提取组件
const renderItem = useCallback(({ item }) => (
  <ConversationItem conversation={item} />
), []);

<FlatList data={conversations} renderItem={renderItem} />
```

---

## 🔍 调试技巧

### 检测不必要的重渲染
```jsx
import { useRef } from "react";

function MyComponent() {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log("Render count:", renderCount.current);

  // ...
}
```

### React DevTools Profiler
使用 React DevTools 的 Profiler 查看组件重渲染原因。

---

## 📝 最佳实践

1. **优先使用专用 hooks**：`useCurrentConversation()` 比 `useConversationsSelector(s => s.currentConversation)` 更清晰

2. **Dispatch 和 State 分开获取**：
   ```jsx
   const { currentConversation } = useConversationsState();
   const { updateConversation } = useConversationsDispatch();
   ```

3. **使用 memo 包裹纯展示组件**：
   ```jsx
   const ConversationItem = memo(function ConversationItem({ conversation }) {
     // 只有 conversation 变化时才重渲染
   });
   ```

4. **避免在 useEffect 中订阅整个状态**：
   ```jsx
   // ❌ 会频繁触发
   const { conversations } = useConversationsState();
   useEffect(() => { ... }, [conversations]);

   // ✅ 只订阅需要的字段
   const conversationCount = useConversationsSelector(s => s.conversations.length);
   useEffect(() => { ... }, [conversationCount]);
   ```
