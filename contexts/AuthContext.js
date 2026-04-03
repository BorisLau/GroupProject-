import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

/**
 * @typedef {Object} AuthError
 * @property {string} message
 * @property {string} [code]
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {import("@supabase/supabase-js").Session|null} session
 * @property {import("@supabase/supabase-js").User|null} user
 * @property {boolean} loading
 * @property {AuthError|null} error
 * @property {(email: string, password: string) => Promise<{data?: any, error?: AuthError}>} signIn
 * @property {(email: string, password: string) => Promise<{data?: any, error?: AuthError}>} signUp
 * @property {(provider: string) => Promise<{data?: any, error?: AuthError}>} signInWithOAuth
 * @property {() => Promise<{error?: AuthError}>} signOut
 * @property {() => void} clearError
 */

/** @type {React.Context<AuthContextValue>} */
const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signInWithOAuth: async () => {},
  signOut: async () => {},
  clearError: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * 使用 selector 获取特定 auth 状态，避免不必要重渲染
 * @template T
 * @param {(value: AuthContextValue) => T} selector
 * @returns {T}
 */
export const useAuthSelector = (selector) => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthSelector must be used within an AuthProvider");
  }
  return selector(context);
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 清除错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createSessionFromUrl = useCallback(async (url) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) {
      throw new Error(errorCode);
    }

    const code = params?.code;
    if (code && !Array.isArray(code)) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        throw error;
      }
      return data;
    }

    const accessToken = params?.access_token;
    const refreshToken = params?.refresh_token;
    if (
      accessToken &&
      !Array.isArray(accessToken) &&
      refreshToken &&
      !Array.isArray(refreshToken)
    ) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        throw error;
      }
      return data;
    }

    return null;
  }, []);

  const waitForPersistedSession = useCallback(async (timeoutMs = 6000) => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession) {
        return currentSession;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
  }, []);

  const isLikelyAuthCallbackUrl = useCallback((url) => {
    if (!url) {
      return false;
    }

    return (
      url.includes("auth/callback") ||
      url.includes("code=") ||
      url.includes("access_token=") ||
      url.includes("refresh_token=") ||
      url.includes("error=") ||
      url.includes("error_description=")
    );
  }, []);

  // 初始化会话监听
  useEffect(() => {
    let isMounted = true;

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Web 端 OAuth 回调处理
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (!code) {
      return;
    }

    supabase.auth.exchangeCodeForSession(code).finally(() => {
      url.searchParams.delete("code");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    });
  }, []);

  // Native 端 deep link 处理
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const handleUrl = async (url) => {
      if (!url) {
        return;
      }

      if (!isLikelyAuthCallbackUrl(url)) {
        return;
      }

      try {
        await createSessionFromUrl(url);
      } catch (_error) {
        // Keep auth flow resilient in Expo Go/dev clients.
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [createSessionFromUrl, isLikelyAuthCallbackUrl]);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError({ message: signInError.message, code: signInError.code });
        return { error: { message: signInError.message, code: signInError.code } };
      }
      return { data };
    } catch (err) {
      const errorInfo = { message: err.message || "登录失败" };
      setError(errorInfo);
      return { error: errorInfo };
    }
  }, []);

  const signUp = useCallback(async (email, password) => {
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "groupproject://",
        },
      });
      if (signUpError) {
        setError({ message: signUpError.message, code: signUpError.code });
        return { error: { message: signUpError.message, code: signUpError.code } };
      }
      return { data };
    } catch (err) {
      const errorInfo = { message: err.message || "注册失败" };
      setError(errorInfo);
      return { error: errorInfo };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider) => {
    setError(null);
    
    try {
      const isExpoGo =
        Platform.OS !== "web" &&
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      const webOrigin =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location.origin
          : null;
      const nativeRedirectTo = isExpoGo
        ? makeRedirectUri({
            preferLocalhost: false,
          })
        : makeRedirectUri({
            scheme: "groupproject",
            path: "auth/callback",
          });

      const redirectTo =
        Platform.OS === "web"
          ? webOrigin
            ? `${webOrigin}/login`
            : undefined
          : nativeRedirectTo;

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== "web",
        },
      });

      if (oauthError) {
        setError({ message: oauthError.message });
        return { error: { message: oauthError.message } };
      }

      // On web, Supabase handles redirect directly in the browser.
      if (Platform.OS === "web") {
        return { data };
      }

      if (!data?.url) {
        const errorInfo = { message: "OAuth URL was not returned by Supabase." };
        setError(errorInfo);
        return { error: errorInfo };
      }

      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (authResult.type === "success" && authResult.url) {
        const sessionData = await createSessionFromUrl(authResult.url);
        return { data: sessionData };
      }

      // In mobile clients, the session may already be persisted by deep-link listeners
      const existingSession = await waitForPersistedSession();
      if (existingSession) {
        return { data: { session: existingSession } };
      }

      const errorInfo = {
        message: "OAuth did not return to app. Please verify Supabase Redirect URLs include your app redirect URI.",
      };
      setError(errorInfo);
      return { error: errorInfo };
    } catch (err) {
      const errorInfo = { message: err.message || "OAuth 登录失败" };
      setError(errorInfo);
      return { error: errorInfo };
    }
  }, [createSessionFromUrl, waitForPersistedSession]);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError({ message: signOutError.message });
        return { error: { message: signOutError.message } };
      }
      return {};
    } catch (err) {
      const errorInfo = { message: err.message || "退出失败" };
      setError(errorInfo);
      return { error: errorInfo };
    }
  }, []);

  // 使用 useMemo 缓存 value，避免不必要的重渲染
  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      error,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      clearError,
    }),
    [session, user, loading, error, signIn, signUp, signInWithOAuth, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
