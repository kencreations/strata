import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { KippPlaceholder } from '../components/KippPlaceholder';
import { Colors, Typography, Spacing } from '../theme';
import { useAuthStore } from '../store/authStore';

export const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { login, signup, isLoading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async () => {
    clearError();
    if (mode === 'login') {
      await login(email, password);
    } else {
      await signup(email, password, fullName);
    }
  };

  const toggleMode = () => {
    clearError();
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.root} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      
      {/* Header Back Button */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.stackMd }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Brand/Hero */}
        <View style={styles.hero}>
          <View style={styles.iconWrapper}>
            <MaterialIcons name="lock-person" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login' 
              ? 'Sign in to sync your schedule across devices.' 
              : 'Sign up to start organizing your multi-layered timeline.'}
          </Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Alex Chen"
                placeholderTextColor={Colors.onSurfaceVariant}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="alex@university.edu"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.submitText}>
              {mode === 'login' ? 'Log In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle Mode */}
        <TouchableOpacity style={styles.toggleBtn} onPress={toggleMode}>
          <Text style={styles.toggleText}>
            {mode === 'login' 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Log in"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Bottom Padding */}
      <View style={{ height: insets.bottom + Spacing.stackLg }} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.marginGlobal, paddingBottom: Spacing.stackMd },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.marginGlobal, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: Spacing.stackLg },
  iconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.stackMd },
  title: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.errorContainer, padding: Spacing.stackMd, borderRadius: 12, marginBottom: Spacing.stackLg },
  errorText: { ...Typography.bodyMd, color: Colors.error, flex: 1 },
  form: { gap: Spacing.stackLg },
  inputGroup: { gap: 6 },
  inputLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1.2 },
  input: { height: 52, backgroundColor: Colors.surfaceContainerLow, borderRadius: 12, paddingHorizontal: 16, ...Typography.bodyLg, color: Colors.onSurface, borderWidth: 1, borderColor: 'transparent' },
  submitBtn: { height: 56, backgroundColor: Colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.stackLg, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { ...Typography.headlineSm, color: Colors.onPrimary },
  toggleBtn: { alignItems: 'center', marginTop: Spacing.stackLg, padding: Spacing.stackSm },
  toggleText: { ...Typography.bodyLg, color: Colors.primary, fontWeight: '600' },
});
