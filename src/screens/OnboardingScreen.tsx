import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { KippPlaceholder } from '../components/KippPlaceholder';
import { Colors, Typography, Spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

import { useAuthStore } from '../store/authStore';
import { useVaultStore } from '../store/vaultStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [dateStr, setDateStr] = useState('');

  const { continueAsGuest } = useAuthStore();
  const { pickAndParse } = useVaultStore();

  useEffect(() => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase());
  }, []);

  const handleManual = () => {
    navigation.navigate('Auth');
  };

  const handleAIUpload = async () => {
    // Attempt parse
    const res = await pickAndParse();
    
    // Authenticate guest regardless of cancel/success
    continueAsGuest();
  };

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
        <Text style={styles.heroBody}>Let's get your classes, work, and routines organized.</Text>
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
  header: { alignItems: 'center', paddingHorizontal: Spacing.marginGlobal, paddingVertical: Spacing.stackMd },
  headerTitle: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center', marginBottom: Spacing.stackSm },
  dateText: { ...Typography.labelMd, color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  heroArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.marginGlobal, gap: Spacing.stackMd },
  heroHeadline: { ...Typography.displayLg, color: Colors.onSurface, textAlign: 'center', marginTop: Spacing.stackMd },
  heroBody: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 300 },
  ctaButton: { marginHorizontal: Spacing.marginGlobal, height: 52, backgroundColor: Colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.stackMd, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  ctaText: { ...Typography.headlineSm, color: Colors.onPrimary },
  bottomSheet: { backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: Spacing.marginGlobal, paddingTop: Spacing.stackMd, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 12, gap: Spacing.stackSm },
  dragHandle: { width: 40, height: 4, backgroundColor: Colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.stackMd },
  optionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: Spacing.insetCard, gap: Spacing.gutterMd },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  optionSubtitle: { ...Typography.labelMd, color: Colors.primary, marginTop: 2 },
});
