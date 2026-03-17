import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { getBackendBaseUrl, getDeepSeekKeyStatus, saveDeepSeekApiKey } from "../lib/backendApi";
import { borderRadius, colors, spacing, typography, commonStyles } from "../styles/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [statusLoading, setStatusLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState("");

  const accessToken = useMemo(() => session?.access_token || "", [session]);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      if (!accessToken) {
        setStatusLoading(false);
        return;
      }

      try {
        const data = await getDeepSeekKeyStatus({ token: accessToken });
        if (!cancelled) {
          setHasKey(Boolean(data?.has_key));
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || "無法讀取 API Key 狀態");
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    };

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleSave = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setMessage("請先輸入 DeepSeek API Key");
      return;
    }
    if (!accessToken) {
      setMessage("請先登入後再儲存 API Key");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await saveDeepSeekApiKey({ token: accessToken, apiKey: trimmedKey });
      setHasKey(true);
      setApiKey("");
      setMessage("DeepSeek API Key 已儲存");
    } catch (error) {
      setMessage(error.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>設定</Text>
        <Text style={styles.subtitle}>
          在這裡輸入 DeepSeek API Key。前端會把它送到後端並加密保存，供後端調用 DeepSeek 生成 mindmap JSON。
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>DeepSeek API Key</Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={styles.input}
            secureTextEntry={true}
          />

          <View style={styles.statusRow}>
            {statusLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.statusText}>
                {hasKey ? "目前已設定 API Key" : "尚未設定 API Key"}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "儲存中..." : "儲存 API Key"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.backendHint}>後端位址：{getBackendBaseUrl()}</Text>
        {message ? <Text style={styles.messageText}>{message}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.headerTitle,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: "600",
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  input: {
    ...commonStyles.input,
    height: 48,
  },
  statusRow: {
    marginTop: spacing.sm,
    minHeight: 22,
    justifyContent: "center",
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  saveButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.bodySmall,
    color: colors.textOnPrimary,
    fontWeight: "600",
  },
  backendHint: {
    ...typography.captionSmall,
    color: colors.textTertiary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  messageText: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
