import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithOAuth: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const createSessionFromUrl = async (url) => {
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
  };

  const waitForPersistedSession = async (timeoutMs = 6000) => {
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
  };

  const isLikelyAuthCallbackUrl = (url) => {
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
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Deep link redirect for email confirmation
        emailRedirectTo: "groupproject://",
      },
    });
    return { data, error };
  };

  const signInWithOAuth = async (provider) => {
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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });

    if (error) {
      return { data, error };
    }

    // On web, Supabase handles redirect directly in the browser.
    if (Platform.OS === "web") {
      return { data, error: null };
    }

    if (!data?.url) {
      return {
        data: null,
        error: new Error("OAuth URL was not returned by Supabase."),
      };
    }

    const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (authResult.type === "success" && authResult.url) {
      const sessionData = await createSessionFromUrl(authResult.url);
      return {
        data: sessionData,
        error: null,
      };
    }

    // In mobile clients, the session may already be persisted by deep-link listeners
    // even when the auth session result isn't "success".
    const existingSession = await waitForPersistedSession();
    if (existingSession) {
      return { data: { session: existingSession }, error: null };
    }

    return {
      data: null,
      error: new Error(
        "OAuth did not return to app. Please verify Supabase Redirect URLs include your app redirect URI."
      ),
    };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
