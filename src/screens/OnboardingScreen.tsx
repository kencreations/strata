import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { KippPlaceholder } from '../components/KippPlaceholder';
import { Colors, Typography, Spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useVaultStore } from '../store/vaultStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

// ─── Step types ───────────────────────────────────────────────────────────────
// 'nickname'  → user types their name
// 'welcome'   → 1.5s animated bridge overlay "Alright, [Name]!"
// 'setup'     → pick PDF or build manually
// 'parsing'   → loading overlay while AI processes PDF
// 'done'      → brief success overlay before navigating

type Step = 'nickname' | 'welcome' | 'setup' | 'parsing' | 'done';

export const OnboardingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const { continueAsGuest } = useAuthStore();
  const { setNickname, nickname: savedNickname } = useSettingsStore();
  const { pickAndParse } = useVaultStore();

  // If nickname already saved, skip straight to setup
  const [step, setStep] = useState<Step>(savedNickname ? 'setup' : 'nickname');
  const [nameInput, setNameInput] = useState('');
  const [resolvedName, setResolvedName] = useState(savedNickname ?? '');
  const [dateStr, setDateStr] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const now = new Date();
    setDateStr(
      now
        .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        .toUpperCase()
    );
  }, []);

  // ── Overlay fade helper ──────────────────────────────────────────────────────
  const transitionTo = (next: Step, delay = 1500) => {
    fadeAnim.setValue(1);
    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStep(next);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, delay);
  };

  // ── Step handlers ────────────────────────────────────────────────────────────
  const handleNicknameSubmit = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setNickname(trimmed);
    setResolvedName(trimmed);
    setStep('welcome');
    transitionTo('setup', 1800);
  };

  const handleManual = () => {
    continueAsGuest();
    navigation.navigate('Auth');
  };

  const handleAIUpload = async () => {
    setStep('parsing');
    const res = await pickAndParse();
    if (!res) {
      // User cancelled picker — go back to setup
      setStep('setup');
      return;
    }
    // Parse succeeded — show success briefly then enter the app
    continueAsGuest();
    setStep('done');
    transitionTo('done', 0); // trigger nav via useEffect below
  };

  // Navigate once we hit 'done' after a short delay
  useEffect(() => {
    if (step === 'done') {
      const t = setTimeout(() => {
        navigation.navigate('MainTabs' as any);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ── Render ───────────────────────────────────────────────────────────────────

  // Step 0: Nickname input
  if (step === 'nickname') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.root, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" />

          <View style={styles.nicknameContainer}>
            <KippPlaceholder size={96} />

            <Text style={styles.nicknameHeadline}>Welcome to Strata!</Text>
            <Text style={styles.nicknameBody}>
              Before we set up your schedule, what should we call you?
            </Text>

            <TextInput
              style={styles.nicknameInput}
              placeholder="Your nickname or first name"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNicknameSubmit}
              maxLength={30}
            />

            <TouchableOpacity
              style={[styles.ctaButton, !nameInput.trim() && { opacity: 0.4 }]}
              onPress={handleNicknameSubmit}
              activeOpacity={0.85}
              disabled={!nameInput.trim()}
            >
              <Text style={styles.ctaText}>Let's go →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 1: Welcome bridge overlay
  if (step === 'welcome') {
    return (
      <View style={[styles.root, styles.overlayCenter, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <Animated.View style={[styles.welcomeOverlay, { opacity: fadeAnim }]}>
          <MaterialIcons name="waving-hand" size={64} color={Colors.primary} />
          <Text style={styles.welcomeHeadline}>
            Alright, {resolvedName}!
          </Text>
          <Text style={styles.welcomeBody}>Let's set up your schedule 🎓</Text>
        </Animated.View>
      </View>
    );
  }

  // Step 3: PDF parsing loader
  if (step === 'parsing') {
    return (
      <View style={[styles.root, styles.overlayCenter, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.parsingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.parsingTitle}>Extracting your classes…</Text>
          <Text style={styles.parsingBody}>
            Kipp AI is reading your school portal. This takes just a moment.
          </Text>
        </View>
      </View>
    );
  }

  // Step 4: Done / success
  if (step === 'done') {
    return (
      <View style={[styles.root, styles.overlayCenter, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <Animated.View style={[styles.welcomeOverlay, { opacity: fadeAnim }]}>
          <MaterialIcons name="check-circle" size={64} color={Colors.primary} />
          <Text style={styles.welcomeHeadline}>Schedule uploaded!</Text>
          <Text style={styles.welcomeBody}>Head to your Planner to review the results.</Text>
        </Animated.View>
      </View>
    );
  }

  // Step 2: Setup options (default / PDF / manual)
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome to your new hub!</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>

      {/* Hero */}
      <View style={styles.heroArea}>
        <KippPlaceholder size={120} />
        <Text style={styles.heroHeadline}>Your schedule is a blank canvas.</Text>
        <Text style={styles.heroBody}>
          Let's get your classes, work, and routines organized.
        </Text>
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={handleManual} activeOpacity={0.85}>
        <Text style={styles.ctaText}>Set up your week manually</Text>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + Spacing.stackLg }]}>
        <View style={styles.dragHandle} />

        <TouchableOpacity style={styles.optionRow} onPress={handleAIUpload} activeOpacity={0.75}>
          <View style={[styles.optionIcon, { backgroundColor: Colors.primary }]}>
            <MaterialIcons name="auto-awesome" size={20} color={Colors.onPrimary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Upload School Portal</Text>
            <Text style={styles.optionSubtitle}>⚡ AI Magic Sync</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow} onPress={handleManual} activeOpacity={0.75}>
          <View style={[styles.optionIcon, { backgroundColor: Colors.surfaceContainerHigh }]}>
            <MaterialIcons name="add" size={20} color={Colors.onSurfaceVariant} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Build Manually</Text>
            <Text style={styles.optionSubtitle}>Start from scratch with default layers</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  overlayCenter: { alignItems: 'center', justifyContent: 'center' },

  // ── Nickname step ──────────────────────────────────────────────────────────
  nicknameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginGlobal,
    gap: Spacing.stackMd,
  },
  nicknameHeadline: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    textAlign: 'center',
    marginTop: Spacing.stackMd,
  },
  nicknameBody: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 300,
  },
  nicknameInput: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    marginTop: Spacing.stackSm,
  },

  // ── Welcome / Done overlays ────────────────────────────────────────────────
  welcomeOverlay: {
    alignItems: 'center',
    gap: Spacing.stackMd,
    paddingHorizontal: Spacing.marginGlobal,
  },
  welcomeHeadline: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  welcomeBody: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // ── Parsing overlay ────────────────────────────────────────────────────────
  parsingOverlay: {
    alignItems: 'center',
    gap: Spacing.stackMd,
    paddingHorizontal: Spacing.marginGlobal,
  },
  parsingTitle: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
    textAlign: 'center',
    marginTop: Spacing.stackSm,
  },
  parsingBody: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },

  // ── Setup step (existing layout) ───────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.marginGlobal,
    paddingVertical: Spacing.stackMd,
  },
  headerTitle: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.stackSm,
  },
  dateText: { ...Typography.labelMd, color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginGlobal,
    gap: Spacing.stackMd,
  },
  heroHeadline: {
    ...Typography.displayLg,
    color: Colors.onSurface,
    textAlign: 'center',
    marginTop: Spacing.stackMd,
  },
  heroBody: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 300 },
  ctaButton: {
    marginHorizontal: Spacing.marginGlobal,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.stackMd,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: { ...Typography.headlineSm, color: Colors.onPrimary },
  bottomSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.marginGlobal,
    paddingTop: Spacing.stackMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    gap: Spacing.stackSm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.stackMd,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: Spacing.insetCard,
    gap: Spacing.gutterMd,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  optionSubtitle: { ...Typography.labelMd, color: Colors.primary, marginTop: 2 },
});
