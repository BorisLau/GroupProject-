import { StyleSheet } from "react-native";

// Color palette for premium, minimal design
export const colors = {
  // Background colors
  background: "#f5f5f7",
  surface: "#ffffff",
  overlay: "rgba(0,0,0,0.2)",
  overlayDark: "rgba(0,0,0,0.3)",

  // Primary colors
  primary: "#007aff",
  primaryDark: "#0051a8",
  secondary: "#555555",

  // Text colors
  textPrimary: "#333333",
  textSecondary: "#555555",
  textTertiary: "#777777",
  textLight: "#999999",
  textOnPrimary: "#ffffff",

  // UI colors
  border: "#cccccc",
  borderLight: "#e0e0e0",
  inputBackground: "#ffffff",
  disabled: "#f0f0f0",
  error: "#ff3b30",
  success: "#34c759",

  // Message bubbles
  userBubble: "#007aff",
  assistantBubble: "#e5e5ea",
};

// Typography
export const typography = {
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  body: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  captionSmall: {
    fontSize: 12,
    color: colors.textTertiary,
  },
};

// Spacing system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Border radius
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Shadows
export const shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Common styles
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: colors.textOnPrimary,
  },
  buttonTextSecondary: {
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
