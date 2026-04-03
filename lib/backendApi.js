import { Platform } from "react-native";

// ============================================
// API 基础配置
// ============================================

// 开发模式检测
const isDevelopment = process.env.EXPO_PUBLIC_ENV === "development" || 
                      process.env.NODE_ENV === "development";

// 后端 API 基础 URL
const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ||
  (isDevelopment ? "http://localhost:8000" : null);

// 检查后端 URL 配置
if (!BACKEND_BASE_URL) {
  const errorMessage = `
╔══════════════════════════════════════════════════════════════════╗
║  ❌ 缺少后端 API 配置                                             ║
╠══════════════════════════════════════════════════════════════════╣
║  缺少的变量:                                                      ║
║    • EXPO_PUBLIC_BACKEND_URL                                     ║
╠══════════════════════════════════════════════════════════════════╣
║  快速修复:                                                        ║
║    1. 在 .env 文件中添加:                                         ║
║       EXPO_PUBLIC_BACKEND_URL=http://localhost:8000              ║
║    2. 重启 Expo 开发服务器                                        ║
╠══════════════════════════════════════════════════════════════════╣
║  注意: 开发模式默认使用 http://localhost:8000                    ║
╚══════════════════════════════════════════════════════════════════╝
  `;
  
  if (!isDevelopment) {
    throw new Error(errorMessage);
  }
}

// 请求配置常量
const DEFAULT_TIMEOUT = 30000; // 30 秒超时
const UPLOAD_TIMEOUT = 120000; // 120 秒上传超时
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// ============================================
// 错误类定义
// ============================================

export class ApiError extends Error {
  constructor(message, statusCode, type, originalError = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.type = type;
    this.originalError = originalError;
  }
}

// ============================================
// 请求工具函数
// ============================================

export const createRequestController = () => {
  const controller = new AbortController();
  let cancelled = false;
  
  return {
    signal: controller.signal,
    abort: () => {
      cancelled = true;
      controller.abort();
    },
    isCancelled: () => cancelled,
  };
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT, signal) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (signal?.aborted) {
      throw new ApiError("上傳已取消", 0, "cancelled", error);
    }
    
    if (error.name === "AbortError") {
      throw new ApiError("請求超時，請檢查網絡連接後重試", 0, "timeout", error);
    }
    
    if (error.message?.includes("Network") || error.message?.includes("network")) {
      throw new ApiError("網絡連接失敗，請檢查網絡設置", 0, "network", error);
    }
    
    throw error;
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (requestFn, maxRetries = MAX_RETRIES) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (error.type === "cancelled") {
        throw error;
      }
      
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      
      if ((error.type === "timeout" || error.type === "network") && attempt < maxRetries) {
        console.log(`[API Retry] 第 ${attempt + 1} 次重试...`);
        await delay(RETRY_DELAY * (attempt + 1));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const getUserFriendlyError = (statusCode, detail = "") => {
  if (statusCode === 400) {
    if (detail.includes("API key") || detail.includes("API Key")) {
      return "DeepSeek API Key 未設置或無效，請前往設置頁面配置";
    }
    return detail || "請求參數錯誤，請檢查輸入";
  }
  
  if (statusCode === 401) return "登入已過期，請重新登入";
  if (statusCode === 403) return "沒有權限執行此操作";
  if (statusCode === 404) return detail.includes("Mindmap") ? "找不到該思維導圖" : "請求的資源不存在";
  if (statusCode === 413) return "文件過大，請選擇小於 10MB 的文件";
  if (statusCode === 415) return "不支持的文件格式，請上傳 PDF 或 Word 文件";
  if (statusCode === 429) return "請求過於頻繁，請稍後再試";
  if (statusCode >= 500) return "服務器錯誤，請稍後再試";
  
  return detail || `請求失敗 (${statusCode})`;
};

const handleHttpError = (response, data) => {
  const statusCode = response.status;
  const detail = data?.detail || "";
  const message = getUserFriendlyError(statusCode, detail);
  
  let type = "unknown";
  if (statusCode >= 400 && statusCode < 500) type = "client";
  else if (statusCode >= 500) type = "server";
  
  throw new ApiError(message, statusCode, type, { response, data });
};

const requestJson = async (path, { token, method = "GET", body, timeout = DEFAULT_TIMEOUT, signal } = {}) => {
  const requestFn = async () => {
    const response = await fetchWithTimeout(
      `${BACKEND_BASE_URL}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeout,
      signal
    );

    const data = await safeJson(response);
    
    if (!response.ok) {
      handleHttpError(response, data);
    }

    return data;
  };

  return fetchWithRetry(requestFn);
};

// ============================================
// API 函数导出
// ============================================

export const saveDeepSeekApiKey = async ({ token, apiKey, signal }) => {
  return requestJson("/v1/settings/deepseek-key", {
    token,
    method: "PUT",
    body: { api_key: apiKey },
    signal,
  });
};

export const getDeepSeekKeyStatus = async ({ token, signal }) => {
  return requestJson("/v1/settings/deepseek-key/status", { token, signal });
};

export const createMindmapJob = async ({
  token,
  file,
  title,
  maxNodes = 50,
  language = "zh-TW",
  signal,
}) => {
  if (!file?.uri) {
    throw new ApiError("請選擇要上傳的文件", 400, "client");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name || "upload.bin",
    type: file.mimeType || "application/octet-stream",
  });

  if (title) formData.append("title", title);
  formData.append("max_nodes", String(maxNodes));
  formData.append("language", language);

  const response = await fetchWithTimeout(
    `${BACKEND_BASE_URL}/v1/mindmap/jobs`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
    UPLOAD_TIMEOUT,
    signal
  );

  const data = await safeJson(response);

  if (!response.ok) {
    handleHttpError(response, data);
  }

  return data;
};

export const getMindmapJob = async ({ token, jobId, signal }) => {
  return requestJson(`/v1/mindmap/jobs/${jobId}`, { token, signal });
};

export const getMindmapById = async ({ token, mindmapId, signal }) => {
  return requestJson(`/v1/mindmaps/${mindmapId}`, { token, signal });
};

export const getBackendBaseUrl = () => BACKEND_BASE_URL;

export const checkNetworkConnection = async () => {
  try {
    const controller = createRequestController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

export const ErrorTypes = {
  NETWORK: "network",
  TIMEOUT: "timeout",
  SERVER: "server",
  CLIENT: "client",
  CANCELLED: "cancelled",
  UNKNOWN: "unknown",
};

export const isRetryableError = (error) => {
  if (error instanceof ApiError) {
    return error.type === ErrorTypes.NETWORK || error.type === ErrorTypes.TIMEOUT;
  }
  return false;
};

export const isAuthError = (error) => {
  if (error instanceof ApiError) {
    return error.statusCode === 401 || error.statusCode === 403;
  }
  return false;
};

export const isCancelledError = (error) => {
  if (error instanceof ApiError) {
    return error.type === ErrorTypes.CANCELLED;
  }
  return false;
};
