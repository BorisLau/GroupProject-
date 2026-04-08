const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:8000";

const buildBackendConnectionHint = () =>
  `目前後端位址：${BACKEND_BASE_URL}。如果是用 iPhone / Android 實機測試，請確認手機和電腦在同一個網路，且後端服務已啟動。`;

const normalizeBackendError = (error, fallbackMessage) => {
  const message =
    error instanceof Error && error.message
      ? error.message
      : fallbackMessage;

  if (/network request failed/i.test(message)) {
    return new Error(`${fallbackMessage} ${buildBackendConnectionHint()}`);
  }

  return error instanceof Error ? error : new Error(message);
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const requestJson = async (path, { token, method = "GET", body } = {}) => {
  let response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw normalizeBackendError(error, "無法連線到後端服務。");
  }

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || `Request failed (${response.status})`);
  }

  return data;
};

export const saveOpenRouterApiKey = async ({ token, apiKey }) => {
  return requestJson("/v1/settings/openrouter-key", {
    token,
    method: "PUT",
    body: { api_key: apiKey },
  });
};

export const getOpenRouterKeyStatus = async ({ token }) => {
  return requestJson("/v1/settings/openrouter-key/status", { token });
};

export const saveDeepSeekApiKey = saveOpenRouterApiKey;
export const getDeepSeekKeyStatus = getOpenRouterKeyStatus;

export const generateMindmap = async ({ token, file, title, maxNodes = 50, language = "zh-TW" }) => {
  if (!file?.uri) {
    throw new Error("Missing file uri");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name || "upload.bin",
    type: file.mimeType || "application/octet-stream",
  });

  if (title) {
    formData.append("title", title);
  }
  formData.append("max_nodes", String(maxNodes));
  formData.append("language", language);

  let response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/v1/mindmaps/generate`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch (error) {
    throw normalizeBackendError(error, "無法將檔案送到後端產生 mindmap。");
  }

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || `Mindmap generation failed (${response.status})`);
  }

  return data;
};

export const getBackendBaseUrl = () => BACKEND_BASE_URL;
