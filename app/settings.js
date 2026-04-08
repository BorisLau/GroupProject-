import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  getBackendBaseUrl,
  getOpenRouterKeyStatus,
  saveOpenRouterApiKey,
} from "../lib/backendApi";
import {
  borderRadius,
  colors,
  spacing,
  typography,
  commonStyles,
} from "../styles/theme";

const SETTINGS_SECTIONS = {
  profile: "profile",
  apiKey: "apiKey",
};

const getInitialDisplayName = (user) =>
  user?.user_metadata?.display_name ||
  user?.user_metadata?.full_name ||
  "";

export default function SettingsScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const [activeSection, setActiveSection] = useState(SETTINGS_SECTIONS.profile);
  const [displayName, setDisplayName] = useState(getInitialDisplayName(user));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [apiKeyStatusMessage, setApiKeyStatusMessage] = useState("");

  const accessToken = useMemo(() => session?.access_token || "", [session]);
  const email = user?.email || "未登入";
  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    setDisplayName(getInitialDisplayName(user));
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      if (!accessToken) {
        return;
      }

      try {
        const result = await getOpenRouterKeyStatus({ token: accessToken });
        const hasKey = Boolean(result?.has_key);
        setHasOpenRouterKey(hasKey);
        setApiKeyStatusMessage(
          hasKey
            ? "後端連線正常，OpenRouter API Key 已設定。"
            : "後端連線正常，但尚未設定 OpenRouter API Key。"
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        setHasOpenRouterKey(false);
        setApiKeyStatusMessage(
          error?.message ||
            `無法連線到後端服務，請檢查：${backendBaseUrl}`
        );
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [accessToken, backendBaseUrl]);

  const handleSaveProfile = async () => {
    if (!session) {
      setProfileMessage("請先登入後再設定 Profile");
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const trimmedDisplayName = displayName.trim();
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: trimmedDisplayName,
        },
      });

      if (error) {
        throw error;
      }

      setProfileMessage("用戶 Profile 已更新");
    } catch (error) {
      setProfileMessage(error.message || "更新 Profile 失敗");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      return;
    }
    if (!accessToken) {
      return;
    }

    setApiKeySaving(true);

    try {
      await saveOpenRouterApiKey({ token: accessToken, apiKey: trimmedKey });
      setApiKey("");
      setHasOpenRouterKey(true);
      setApiKeyStatusMessage("OpenRouter API Key 已儲存。");
    } catch (error) {
      setApiKeyStatusMessage(error?.message || "儲存 API Key 失敗。");
      return;
    } finally {
      setApiKeySaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>設定</Text>

        <View style={styles.sectionSwitchRow}>
          <TouchableOpacity
            style={[
              styles.sectionSwitchButton,
              activeSection === SETTINGS_SECTIONS.profile &&
                styles.sectionSwitchButtonActive,
            ]}
            onPress={() => setActiveSection(SETTINGS_SECTIONS.profile)}
          >
            <Ionicons
              name="person-circle-outline"
              size={18}
              color={
                activeSection === SETTINGS_SECTIONS.profile
                  ? colors.textOnPrimary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.sectionSwitchButtonText,
                activeSection === SETTINGS_SECTIONS.profile &&
                  styles.sectionSwitchButtonTextActive,
              ]}
            >
              用戶 Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionSwitchButton,
              activeSection === SETTINGS_SECTIONS.apiKey &&
                styles.sectionSwitchButtonActive,
            ]}
            onPress={() => setActiveSection(SETTINGS_SECTIONS.apiKey)}
          >
            <Ionicons
              name="key-outline"
              size={18}
              color={
                activeSection === SETTINGS_SECTIONS.apiKey
                  ? colors.textOnPrimary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.sectionSwitchButtonText,
                activeSection === SETTINGS_SECTIONS.apiKey &&
                  styles.sectionSwitchButtonTextActive,
              ]}
            >
              設置 API Key
            </Text>
          </TouchableOpacity>
        </View>

        {activeSection === SETTINGS_SECTIONS.profile ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>用戶 Profile</Text>

            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyValue}>{email}</Text>
            </View>

            <Text style={styles.label}>顯示名稱</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="輸入你的顯示名稱"
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.primaryButton, profileSaving && styles.primaryButtonDisabled]}
              disabled={profileSaving}
              onPress={handleSaveProfile}
            >
              <Text style={styles.primaryButtonText}>
                {profileSaving ? "儲存中..." : "儲存 Profile"}
              </Text>
            </TouchableOpacity>

            {profileMessage ? (
              <Text style={styles.messageText}>{profileMessage}</Text>
            ) : null}
          </View>
        ) : null}

        {activeSection === SETTINGS_SECTIONS.apiKey ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>設置 API Key</Text>

            <Text style={styles.label}>OpenRouter API Key</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyValue}>
                後端：{backendBaseUrl}
              </Text>
            </View>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyValue}>
                狀態：{hasOpenRouterKey ? "已設定" : "未設定"}
              </Text>
            </View>
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

            <TouchableOpacity
              style={[styles.primaryButton, apiKeySaving && styles.primaryButtonDisabled]}
              disabled={apiKeySaving}
              onPress={handleSaveApiKey}
            >
              <Text style={styles.primaryButtonText}>
                {apiKeySaving ? "儲存中..." : "儲存 API Key"}
              </Text>
            </TouchableOpacity>

            {apiKeyStatusMessage ? (
              <Text style={styles.messageText}>{apiKeyStatusMessage}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  title: {
    ...typography.headerTitle,
    marginBottom: spacing.lg,
  },
  sectionSwitchRow: {
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionSwitchButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sectionSwitchButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sectionSwitchButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  sectionSwitchButtonTextActive: {
    color: colors.textOnPrimary,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.lg,
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
    marginBottom: spacing.md,
  },
  readonlyField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.disabled,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  readonlyValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.bodySmall,
    color: colors.textOnPrimary,
    fontWeight: "600",
  },
  messageText: {
    marginTop: spacing.md,
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
