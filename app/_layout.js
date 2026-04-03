import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { ConversationsProvider } from "../hooks/useConversations";
import { memo } from "react";

// 使用 memo 避免不必要的重渲染
const RootLayout = memo(function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ConversationsProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="canvas" />
            <Stack.Screen name="login" />
            <Stack.Screen name="settings" />
          </Stack>
        </ConversationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
});

export default RootLayout;
