const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:8000";

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const requestJson = async (path, { token, method = "GET", body } = {}) => {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || `Request failed (${response.status})`);
  }

  return data;
};

export const saveDeepSeekApiKey = async ({ token, apiKey }) => {
  return requestJson("/v1/settings/deepseek-key", {
    token,
    method: "PUT",
    body: { api_key: apiKey },
  });
};

export const getDeepSeekKeyStatus = async ({ token }) => {
  return requestJson("/v1/settings/deepseek-key/status", { token });
};

export const createMindmapJob = async ({ token, file, title, maxNodes = 50, language = "zh-TW" }) => {
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

  const response = await fetch(`${BACKEND_BASE_URL}/v1/mindmap/jobs`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.detail || `Job creation failed (${response.status})`);
  }

  return data;
};

export const getMindmapJob = async ({ token, jobId }) => {
  return requestJson(`/v1/mindmap/jobs/${jobId}`, { token });
};

export const getMindmapById = async ({ token, mindmapId }) => {
  return requestJson(`/v1/mindmaps/${mindmapId}`, { token });
};

export const getBackendBaseUrl = () => BACKEND_BASE_URL;
