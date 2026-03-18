import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { ConversationsProvider } from "../hooks/useConversations";

export default function RootLayout() {
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
}
