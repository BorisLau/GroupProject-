# UploadCenterPanel 组件使用指南

## 🆕 新增功能

### 1. 上传进度条
- 实时显示上传进度（0-100%）
- 进度条动画效果
- 显示当前状态文字（"正在上傳文件..." / "等待服務器處理..."）

### 2. 取消上传按钮
- 上传过程中显示"取消上傳"按钮
- 点击后立即中断上传
- 清理上传状态

---

## 📖 Props 说明

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| onUploadPress | Function | ✅ | 上传按钮点击回调 |
| onCancelPress | Function | ❌ | 取消按钮点击回调 |
| selectedFileName | string | ❌ | 已选择的文件名 |
| isBusy | boolean | ❌ | 是否正在处理中 |
| progress | number | ❌ | 上传进度 0-100 |
| statusText | string | ❌ | 状态文本 |
| hasApiKey | boolean | ❌ | 是否已设置 API Key |
| isCheckingApiKey | boolean | ❌ | 是否正在检查 API Key |

---

## 💡 使用示例

### 基础用法
```jsx
import UploadCenterPanel from "../components/UploadCenterPanel";

function MyComponent() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const controllerRef = useRef(null);

  const handleUpload = async () => {
    setIsUploading(true);
    // ... 上传逻辑
  };

  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(0);
  };

  return (
    <UploadCenterPanel
      onUploadPress={handleUpload}
      onCancelPress={handleCancel}
      isBusy={isUploading}
      progress={uploadProgress}
      statusText={isUploading ? "正在上傳..." : ""}
    />
  );
}
```

### 完整用法（带 API Key 检查）
```jsx
<UploadCenterPanel
  onUploadPress={handleAttachFile}
  onCancelPress={handleCancelUpload}
  selectedFileName={attachedFileName}
  isBusy={isGenerating}
  progress={uploadProgress}
  statusText={uploadStatus || generationStatus}
  hasApiKey={hasDeepSeekKey}
  isCheckingApiKey={isCheckingApiKey}
/>
```

---

## 🎨 界面展示

### 空闲状态
```
┌─────────────────────────┐
│    [☁️ 上传图标]         │
│      上傳檔案            │
│  點擊後選擇文件以建立內容  │
└─────────────────────────┘
DeepSeek API Key：已設定
```

### 上传中（带进度条）
```
┌─────────────────────────┐
│   [⏳ 加载动画]          │
│      處理中...           │
│                         │
│  [████████░░░░░░░] 45%  │
│      正在上傳文件...      │
│                         │
│   [❌ 取消上傳]          │
└─────────────────────────┘
```

### 上传完成
```
┌─────────────────────────┐
│   [✅ 成功图标]          │
│      上傳檔案            │
│                         │
│  [████████████████] 100%│
│    上傳完成，AI 處理中... │
└─────────────────────────┘
```

---

## 🔧 实现说明

### 进度模拟
由于 React Native 的 `fetch` 不直接支持进度回调，我们使用**模拟进度**方案：

1. **上传阶段（0-90%）**：根据文件大小估算上传时间，平滑递增进度
2. **服务器处理阶段（90-100%）**：上传完成后，等待服务器响应，进度保持在 90%，完成后跳到 100%

### 取消机制
使用 `AbortController` 实现请求取消：

```javascript
const controller = createRequestController();

// 传递 signal 给 fetch
createMindmapJob({ ..., signal: controller.signal });

// 取消时调用
controller.abort();
```

---

## ⚠️ 注意事项

1. **取消上传后需要清理状态**
   ```javascript
   setUploadProgress(0);
   setIsUploading(false);
   ```

2. **取消错误特殊处理**
   ```javascript
   if (isCancelledError(error)) {
     // 用户取消，不显示错误提示
     return;
   }
   ```

3. **进度条只在 `isBusy=true` 且 `0 < progress < 100` 时显示**

---

## 📱 响应式设计

- 宽度：66% 容器宽度
- 最小高度：220px
- 进度条高度：8px
- 圆角：24px（xl）

适配各种屏幕尺寸。
