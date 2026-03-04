import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY. Ensure GroupProject-/.env exists at the project root."
  );
}

const isWebSSR = Platform.OS === "web" && typeof window === "undefined";
const usePersistentAuth = !isWebSSR;

const authOptions = {
  autoRefreshToken: usePersistentAuth,
  persistSession: usePersistentAuth,
  detectSessionInUrl: false,
};

if (usePersistentAuth) {
  authOptions.storage = AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: authOptions,
});
