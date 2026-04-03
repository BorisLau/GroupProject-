import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// ============================================
// Supabase 客户端配置
// ============================================

// 获取环境变量
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// 开发模式标志
const isDevelopment = process.env.EXPO_PUBLIC_ENV === "development" || 
                      process.env.NODE_ENV === "development";

// 检查环境变量
if (!supabaseUrl || !supabaseKey) {
  const errorMessage = `
╔══════════════════════════════════════════════════════════════════╗
║  ❌ 缺少 Supabase 环境变量配置                                    ║
╠══════════════════════════════════════════════════════════════════╣
║  缺少的变量:                                                      ║
║    ${!supabaseUrl ? '• EXPO_PUBLIC_SUPABASE_URL' : ''}                           ║
║    ${!supabaseKey ? '• EXPO_PUBLIC_SUPABASE_KEY' : ''}                           ║
╠══════════════════════════════════════════════════════════════════╣
║  快速修复:                                                        ║
║    1. 复制 .env.example 为 .env                                   ║
║    2. 填入你的 Supabase 配置                                      ║
║    3. 重启 Expo 开发服务器                                        ║
╠══════════════════════════════════════════════════════════════════╣
║  获取 Supabase 配置:                                              ║
║    https://supabase.com/dashboard > 你的项目 > Settings > API     ║
╚══════════════════════════════════════════════════════════════════╝
  `;
  
  // 开发模式下打印错误但不崩溃，方便调试
  if (isDevelopment) {
    console.error(errorMessage);
    console.warn("⚠️  开发模式: 使用 Mock Supabase 客户端（功能受限）");
  } else {
    // 生产环境直接抛出错误
    throw new Error(errorMessage);
  }
}

// 开发模式 Mock 客户端（当配置缺失时）
const createMockClient = () => {
  console.warn("🔄 使用 Mock Supabase 客户端");
  return {
    auth: {
      signInWithPassword: async () => ({ 
        data: null, 
        error: new Error("Supabase 未配置，请在 .env 文件中设置") 
      }),
      signUp: async () => ({ 
        data: null, 
        error: new Error("Supabase 未配置，请在 .env 文件中设置") 
      }),
      signInWithOAuth: async () => ({ 
        data: null, 
        error: new Error("Supabase 未配置，请在 .env 文件中设置") 
      }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {} 
          } 
        } 
      }),
      updateUser: async () => ({ error: new Error("Supabase 未配置") }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: new Error("Supabase 未配置") }),
          execute: async () => ({ data: [], error: new Error("Supabase 未配置") }),
        }),
        execute: async () => ({ data: [], error: new Error("Supabase 未配置") }),
      }),
      insert: async () => ({ data: null, error: new Error("Supabase 未配置") }),
      update: async () => ({ data: null, error: new Error("Supabase 未配置") }),
      delete: async () => ({ data: null, error: new Error("Supabase 未配置") }),
      upsert: async () => ({ data: null, error: new Error("Supabase 未配置") }),
    }),
  };
};

// 判断是否为 Web SSR（服务端渲染）
const isWebSSR = Platform.OS === "web" && typeof window === "undefined";
const usePersistentAuth = !isWebSSR;

// 配置认证选项
const authOptions = {
  autoRefreshToken: usePersistentAuth,
  persistSession: usePersistentAuth,
  detectSessionInUrl: false,
};

// 在客户端使用 AsyncStorage 持久化会话
if (usePersistentAuth) {
  authOptions.storage = AsyncStorage;
}

// 创建 Supabase 客户端
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { auth: authOptions })
  : createMockClient();

// 便捷导出：检查 Supabase 是否已配置
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

// 便捷导出：获取配置状态
export const getSupabaseConfigStatus = () => ({
  configured: isSupabaseConfigured,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : null,
  hasKey: !!supabaseKey,
  environment: isDevelopment ? "development" : "production",
});
