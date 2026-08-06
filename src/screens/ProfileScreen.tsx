import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { Colors, Typography, Spacing } from '../theme';
import { useAuthStore } from '../store/authStore';
import { getSyncStatus, type SyncStatus } from '../services/syncService';

const AVATAR_URI = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZrTOWD5UKhoH9nwwzry1x08wKcr87K9FvJwo9LVL13gs-h6Q5ytm-VOy3sd_OnPgwPP1AX4tq9wVIcbPEvLiTeb-dBYunIo_K82oZDEePKu8Umm_HsoxsQbrrFITgd7N203zKOD-Agq_D8Cft_psb7rMCIEZTwoVrC65WODP1f0pH82ogJYuz5WqEagUlaH55Flb-HpratVH9CY4YO3pt6SuxkjH3H_qsBzhLHIoooPKPG3d0s6Ep';

// ─── Toggle Component ─────────────────────────────────────────────────────────
const Toggle: React.FC<{ initialValue?: boolean }> = ({ initialValue = false }) => {
  const [on, setOn] = useState(initialValue);
  const anim = useRef(new Animated.Value(initialValue ? 1 : 0)).current;

  const toggle = () => {
    Animated.spring(anim, { toValue: on ? 0 : 1, useNativeDriver: true, friction: 8 }).start();
    setOn(!on);
  };

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 26] });

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={[styles.toggleTrack, on && styles.toggleTrackOn]}>
      <Animated.View style={[styles.toggleKnob, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  );
};

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user, logout } = useAuthStore();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  
  useEffect(() => {
    if (isFocused) {
      getSyncStatus().then(setSyncStatus);
    }
  }, [isFocused]);

  const syncText = syncStatus === 'synced' ? 'All Data Synced' : syncStatus === 'pending' ? 'Sync Pending' : 'Offline Mode';
  const syncSub = syncStatus === 'synced' ? 'Local DB exactly matches cloud' : syncStatus === 'pending' ? 'Changes queued for push' : 'Working completely offline';
  const syncIcon = syncStatus === 'synced' ? 'cloud-done' : syncStatus === 'pending' ? 'cloud-upload' : 'cloud-off';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.stackMd, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.bgBlob1} />
          <View style={styles.bgBlob2} />

          <View style={styles.avatarWrapper}>
            <Image source={{ uri: AVATAR_URI }} style={styles.avatar} />
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.fullName ?? 'Alex Chen'}</Text>
            <TouchableOpacity style={styles.editBtn}>
              <MaterialIcons name="edit" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <Text style={styles.role}>{user?.role === 'student' ? 'Computer Engineering Student' : 'Instructor'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>3.8</Text>
              <Text style={styles.statLabel}>GPA Goal</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.tertiary }]}>92%</Text>
              <Text style={styles.statLabel}>Study Goal</Text>
            </View>
          </View>
        </View>

        {/* Cloud Sync Banner */}
        <TouchableOpacity style={styles.syncBanner} activeOpacity={0.85}>
          <View style={styles.syncIconWrapper}>
            <MaterialIcons name={syncIcon} size={22} color={Colors.onTertiaryContainer} />
            {syncStatus === 'synced' && <View style={styles.syncPulse} />}
          </View>
          <View style={styles.syncText}>
            <Text style={styles.syncTitle}>{syncText}</Text>
            <Text style={styles.syncSub}>{syncSub}</Text>
          </View>
          <MaterialIcons name="sync" size={22} color={`${Colors.onTertiaryContainer}80`} />
        </TouchableOpacity>

        {/* Smart Automations */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionGroupLabel}>SMART AUTOMATIONS</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: `${Colors.primary}1A` }]}><MaterialIcons name="notifications-off" size={20} color={Colors.primary} /></View>
              <View style={styles.settingText}><Text style={styles.settingTitle}>Auto-Mute Classes</Text><Text style={styles.settingSub}>Silences device based on schedule</Text></View>
              <Toggle initialValue={true} />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: `${Colors.secondary}1A` }]}><MaterialIcons name="commute" size={20} color={Colors.secondary} /></View>
              <View style={styles.settingText}><Text style={styles.settingTitle}>Smart Travel Blocks</Text><Text style={styles.settingSub}>Adds commute time automatically</Text></View>
              <Toggle initialValue={false} />
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.marginGlobal, gap: Spacing.stackLg },
  profileCard: { backgroundColor: Colors.surfaceContainer, borderRadius: 20, padding: Spacing.stackMd, alignItems: 'center', overflow: 'hidden', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  bgBlob1: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: `${Colors.primary}1A` },
  bgBlob2: { position: 'absolute', bottom: -30, left: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: `${Colors.tertiary}1A` },
  avatarWrapper: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: Colors.surface, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4, marginBottom: Spacing.stackSm },
  avatar: { width: '100%', height: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...Typography.headlineMd, color: Colors.onSurface },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  role: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.stackMd, width: '100%', marginTop: Spacing.stackSm },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: Colors.surfaceContainerHighest, borderRadius: 12, padding: Spacing.stackSm },
  statValue: { ...Typography.headlineSm, color: Colors.primary },
  statLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: 2 },
  syncBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.tertiaryContainer, borderRadius: 16, padding: Spacing.stackMd, gap: Spacing.stackMd, shadowColor: Colors.tertiary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  syncIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${Colors.onTertiary}20`, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  syncPulse: { position: 'absolute', inset: 0, borderRadius: 22, backgroundColor: `${Colors.onTertiary}15` },
  syncText: { flex: 1 },
  syncTitle: { ...Typography.headlineSm, color: Colors.onTertiaryContainer },
  syncSub: { ...Typography.bodyMd, color: `${Colors.onTertiaryContainer}CC`, marginTop: 2 },
  sectionGroup: { gap: Spacing.stackSm },
  sectionGroupLabel: { ...Typography.labelMd, color: Colors.outline, letterSpacing: 1.5, paddingHorizontal: 8 },
  settingsCard: { backgroundColor: Colors.surfaceContainer, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, padding: Spacing.stackMd, gap: Spacing.stackMd },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackMd },
  settingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingText: { flex: 1, minWidth: 0 },
  settingTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  settingSub: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.surfaceVariant },
  toggleTrack: { width: 48, height: 26, borderRadius: 13, backgroundColor: Colors.surfaceVariant, justifyContent: 'center', flexShrink: 0 },
  toggleTrackOn: { backgroundColor: Colors.primary },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.onPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, padding: 16, backgroundColor: Colors.errorContainer, borderRadius: 16 },
  logoutText: { ...Typography.labelMd, color: Colors.error },
});
