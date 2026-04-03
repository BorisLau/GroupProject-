# API 错误处理使用指南

## 🆕 新增功能

### 1. 自动超时处理
- 普通请求：30 秒超时
- 文件上传：60 秒超时
- 超时后自动重试 2 次

### 2. 智能重试机制
- 网络错误自动重试
- 超时错误自动重试
- 客户端错误（4xx）不重试
- 指数退避策略（1s, 2s）

### 3. 用户友好的错误消息
```javascript
// 之前：用户看到 "Request failed (500)"
// 现在：用户看到 "服務器錯誤，請稍後再試"
```

---

## 📖 使用方法

### 基础用法（无需修改）

```javascript
import { createMindmapJob } from "../lib/backendApi";

// 自动拥有超时和重试功能
try {
  const result = await createMindmapJob({ token, file, title });
} catch (error) {
  // error.message 已经是用户友好的中文提示
  console.log(error.message); // "網絡連接失敗，請檢查網絡設置"
}
```

### 高级用法 - 判断错误类型

```javascript
import { ApiError, ErrorTypes, isAuthError, isRetryableError } from "../lib/backendApi";

try {
  const result = await createMindmapJob({ token, file, title });
} catch (error) {
  if (error instanceof ApiError) {
    // 判断错误类型
    switch (error.type) {
      case ErrorTypes.TIMEOUT:
        // 超时错误
        showToast("請求超時，請檢查網絡");
        break;
      case ErrorTypes.NETWORK:
        // 网络错误
        showToast("網絡連接失敗");
        break;
      case ErrorTypes.SERVER:
        // 服务器错误
        showToast("服務器繁忙，請稍後");
        break;
      case ErrorTypes.CLIENT:
        // 客户端错误
        showToast(error.message); // 显示具体错误
        break;
    }
    
    // 判断是否需要重新登录
    if (isAuthError(error)) {
      router.replace("/login");
    }
    
    // 判断是否可以重试
    if (isRetryableError(error)) {
      showRetryButton();
    }
  }
}
```

---

## 📋 错误代码对照表

| HTTP 状态码 | 错误类型 | 用户看到的消息 |
|------------|---------|---------------|
| 400 | 参数错误 | 根据具体情况显示 |
| 401 | 认证过期 | "登入已過期，請重新登入" |
| 403 | 权限不足 | "沒有權限執行此操作" |
| 404 | 资源不存在 | "找不到該思維導圖/任務" |
| 413 | 文件过大 | "文件過大，請選擇小於 10MB 的文件" |
| 415 | 格式不支持 | "不支持的文件格式，請上傳 PDF 或 Word" |
| 429 | 请求过快 | "請求過於頻繁，請稍後再試" |
| 500+ | 服务器错误 | "服務器錯誤，請稍後再試" |
| 0 (timeout) | 超时 | "請求超時，請檢查網絡連接後重試" |
| 0 (network) | 网络错误 | "網絡連接失敗，請檢查網絡設置" |

---

## 🔍 新增工具函数

### 检查网络连接
```javascript
import { checkNetworkConnection } from "../lib/backendApi";

const isOnline = await checkNetworkConnection();
if (!isOnline) {
  Alert.alert("提示", "無法連接到服務器，請檢查網絡");
}
```

### 获取后端地址
```javascript
import { getBackendBaseUrl } from "../lib/backendApi";

console.log(getBackendBaseUrl()); // "http://localhost:8000"
```

---

## 🎯 错误处理最佳实践

### 1. 统一错误处理（推荐）
```javascript
// hooks/useApi.js
import { ApiError, isAuthError } from "../lib/backendApi";

export const useApiErrorHandler = () => {
  const handleError = (error, options = {}) => {
    const { onAuthError, onRetryableError, onError } = options;
    
    if (error instanceof ApiError) {
      // 认证错误统一处理
      if (isAuthError(error)) {
        onAuthError?.(error);
        return;
      }
      
      // 可重试错误
      if (error.type === "network" || error.type === "timeout") {
        onRetryableError?.(error);
        return;
      }
    }
    
    // 其他错误
    onError?.(error);
  };
  
  return { handleError };
};
```

### 2. 组件中使用
```javascript
function MyComponent() {
  const { handleError } = useApiErrorHandler();
  const router = useRouter();
  
  const handleUpload = async () => {
    try {
      await createMindmapJob({ token, file });
    } catch (error) {
      handleError(error, {
        onAuthError: () => router.replace("/login"),
        onRetryableError: () => showRetryDialog(),
        onError: (err) => Alert.alert("錯誤", err.message),
      });
    }
  };
}
```

---

## ⚡ 性能优化

### 自动重试策略
- 网络错误：最多重试 2 次
- 超时错误：最多重试 2 次
- 重试间隔：1秒、2秒（指数退避）
- 客户端错误：立即失败，不重试

### 超时配置
| 请求类型 | 超时时间 | 说明 |
|---------|---------|------|
| JSON 请求 | 30 秒 | 普通 API 调用 |
| 文件上传 | 60 秒 | 大文件需要更长时间 |
| 健康检查 | 5 秒 | 快速检测网络状态 |

---

## 📝 迁移说明

**完全向后兼容！** 现有代码无需修改即可使用新功能。

旧代码：
```javascript
catch (error) {
  // error.message 可能是英文技术错误
  console.log(error.message); // "Request failed (500)"
}
```

新代码（自动生效）：
```javascript
catch (error) {
  // error.message 已经是用户友好的中文
  console.log(error.message); // "服務器錯誤，請稍後再試"
}
```

如需使用高级功能，可导入 `ApiError` 类进行类型判断。
