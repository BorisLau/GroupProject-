import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  commonStyles,
} from "../styles/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return false;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!password) {
      setError("Please enter your password");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { data, error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          // Show success message for sign up
          setError("");
          setIsSignUp(false);
          // You might want to show a success toast here
          alert("Account created! Please check your email to verify.");
        }
      } else {
        const { data, error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          // Navigation is handled by AuthContext
          router.replace("/");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Smart Map</Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? "Create your account"
                : "Sign in to your account"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused,
                  error && !emailFocused && styles.inputError,
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused,
                  error && !passwordFocused && styles.inputError,
                ]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                editable={!loading}
              />
            </View>

            {/* Confirm Password Input (Sign Up only) */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    confirmPasswordFocused && styles.inputFocused,
                    error && !confirmPasswordFocused && styles.inputError,
                  ]}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textLight}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                  }}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!loading}
                />
              </View>
            )}

            {/* Error Message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Sign In/Up */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleMode} disabled={loading}>
                <Text style={styles.toggleButton}>
                  {isSignUp ? "Sign In" : "Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  container: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl * 1.5,
  },
  title: {
    ...typography.headerTitle,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...commonStyles.surface,
  },
  inputGroup: {
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
    height: 50,
    fontSize: 16,
  },
  inputFocused: {
    ...commonStyles.inputFocused,
  },
  inputError: {
    ...commonStyles.inputError,
  },
  errorText: {
    ...commonStyles.errorText,
    marginBottom: spacing.md,
  },
  submitButton: {
    ...commonStyles.button,
    ...commonStyles.buttonPrimary,
    height: 50,
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    ...commonStyles.buttonDisabled,
  },
  submitButtonText: {
    ...commonStyles.buttonText,
    ...commonStyles.buttonTextPrimary,
    fontSize: 17,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  toggleButton: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
});
