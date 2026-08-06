import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { KippPlaceholder } from '../components/KippPlaceholder';
import { Colors, Typography, Spacing } from '../theme';
import { useScheduleStore } from '../store/scheduleStore';
import { useAuthStore } from '../store/authStore';
import { resolveConflict, formatCountdown } from '../services/scheduleUtils';
import type { MainTabParamList } from '../navigation/RootNavigator';

type Nav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

// ─── Sub-components ───────────────────────────────────────────────────────────

const UpNextHeroCard: React.FC<{
  countdown: string;
  eventName: string;
  location: string;
}> = ({ countdown, eventName, location }) => (
  <View style={heroStyles.card}>
    <View style={heroStyles.decorCircle} />
    <View style={heroStyles.content}>
      <View style={heroStyles.topRow}>
        <View>
          <Text style={heroStyles.label}>UP NEXT</Text>
          <Text style={heroStyles.className}>{eventName}</Text>
          <Text style={heroStyles.room}>{location || 'No location set'}</Text>
        </View>
        <View style={heroStyles.timeBadge}>
          <MaterialIcons name="schedule" size={14} color={Colors.onPrimary} />
          <Text style={heroStyles.timeBadgeText}>Live</Text>
        </View>
      </View>
      <View style={heroStyles.leaveRow}>
        <View style={heroStyles.leaveLeft}>
          <MaterialIcons name="directions-walk" size={20} color={Colors.primaryFixed} />
          <Text style={heroStyles.leaveText}>Starts in</Text>
        </View>
        <Text style={heroStyles.countdown}>{countdown}</Text>
      </View>
    </View>
  </View>
);

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: Spacing.insetCard,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  decorCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.4,
  },
  content: { gap: Spacing.stackMd },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { ...Typography.labelMd, color: Colors.primaryFixed, letterSpacing: 1.5, marginBottom: 4 },
  className: { ...Typography.headlineMd, color: Colors.onPrimary },
  room: { ...Typography.bodyMd, color: Colors.inversePrimary, marginTop: 2, opacity: 0.9 },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, gap: 4,
  },
  timeBadgeText: { ...Typography.labelSm, color: Colors.onPrimary },
  leaveRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12,
  },
  leaveLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leaveText: { ...Typography.bodyMd, color: Colors.onPrimary },
  countdown: { ...Typography.headlineSm, color: Colors.onPrimary, letterSpacing: -0.5 },
});

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  
  const { user } = useAuthStore();
  const { timeline, upNextEvent, leaveInSeconds, refreshToday, initialize } = useScheduleStore();
  
  const [countdownStr, setCountdownStr] = useState('00:00');

  useEffect(() => {
    if (user) initialize(user.id);
  }, [user]);

  useEffect(() => {
    if (isFocused && user) {
      refreshToday(user.id);
    }
  }, [isFocused, user]);

  useEffect(() => {
    let secs = leaveInSeconds;
    setCountdownStr(formatCountdown(secs));
    const id = setInterval(() => {
      if (secs > 0) {
        secs--;
        setCountdownStr(formatCountdown(secs));
      } else {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [leaveInSeconds]);

  const handleResolve = async (conflictId?: string) => {
    if (conflictId && user) {
      await resolveConflict(conflictId, 'manual');
      refreshToday(user.id);
    }
  };

  const getEventIcon = (layerName?: string) => {
    if (!layerName) return 'event';
    if (layerName.toLowerCase().includes('academic') || layerName.toLowerCase().includes('university')) return 'school';
    if (layerName.toLowerCase().includes('work')) return 'work';
    return 'access-time';
  };

  const formatTimeRange = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    return `${d1.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${d2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

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
        {/* Greeting */}
        <View style={styles.section}>
          <Text style={styles.greeting}>Good morning, {user?.fullName?.split(' ')[0] ?? 'Alex'}!</Text>
          <Text style={styles.dateLine}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • {timeline.length} events today
          </Text>
        </View>

        {/* Up Next Hero Card */}
        {upNextEvent && (
          <View style={styles.section}>
            <UpNextHeroCard 
              countdown={countdownStr} 
              eventName={upNextEvent.title}
              location={upNextEvent.location ?? ''}
            />
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Timeline</Text>
          <View style={styles.timeline}>
            {/* Vertical connector line */}
            <View style={styles.timelineLine} />

            {timeline.length === 0 && (
              <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.onSurfaceVariant }}>No events today.</Text>
            )}

            {timeline.map((event) => {
              const icon = getEventIcon(event.layerName);
              const isConflict = event.hasConflict;
              
              const iconBg = isConflict ? Colors.errorContainer : `${event.layerColor ?? Colors.primary}33`;
              const iconColor = isConflict ? Colors.error : (event.layerColor ?? Colors.primary);
              
              return (
                <View key={event.id} style={[styles.eventRow, event.isPast && { opacity: 0.65 }]}>
                  {/* Dot */}
                  <View style={[styles.eventDot, { backgroundColor: iconBg }]}>
                    <MaterialIcons name={icon} size={18} color={iconColor} />
                  </View>

                  {/* Card */}
                  <View style={[
                    styles.eventCard,
                    isConflict && styles.conflictCard,
                  ]}>
                    {/* Conflict diagonal stripe overlay */}
                    {isConflict && <View style={styles.conflictStripe} />}

                    <View style={styles.eventCardHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventSubtitle}>{event.layerName}</Text>
                      </View>
                      <Text style={[styles.eventTime, isConflict && { color: Colors.error }]}>
                        {formatTimeRange(event.startTime, event.endTime)}
                      </Text>
                    </View>
                    
                    {!!event.location && !isConflict && (
                      <Text style={styles.eventSubtitle}>{event.location}</Text>
                    )}

                    {/* Conflict action + Kipp placeholder */}
                    {isConflict && (
                      <View style={styles.conflictActions}>
                        <KippPlaceholder size={32} />
                        <TouchableOpacity style={styles.resolveButton} onPress={() => handleResolve(event.conflictId)}>
                          <Text style={styles.resolveText}>Resolve Conflict</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Study')}
      >
        <MaterialIcons name="timer" size={22} color={Colors.onPrimaryContainer} />
        <Text style={styles.fabText}>Start Focus</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.marginGlobal, gap: Spacing.stackLg },
  section: { gap: Spacing.stackSm },
  greeting: { ...Typography.headlineMd, color: Colors.onBackground },
  dateLine: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onBackground },
  timeline: { gap: Spacing.stackMd, position: 'relative' },
  timelineLine: { position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, backgroundColor: Colors.surfaceVariant, zIndex: 0 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.stackMd, zIndex: 1 },
  eventDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: Colors.background, flexShrink: 0 },
  eventCard: { flex: 1, backgroundColor: Colors.surfaceContainer, borderRadius: 16, padding: Spacing.stackMd, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
  conflictCard: { backgroundColor: `${Colors.errorContainer}60` },
  conflictStripe: { position: 'absolute', inset: 0, opacity: 0.06, backgroundColor: Colors.error },
  eventCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { ...Typography.bodyLg, color: Colors.onSurface },
  eventTime: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  eventSubtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  conflictActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm, marginTop: 4 },
  resolveButton: { flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  resolveText: { ...Typography.labelMd, color: Colors.error },
  fab: { position: 'absolute', right: Spacing.marginGlobal, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryContainer, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  fabText: { ...Typography.labelMd, color: Colors.onPrimaryContainer },
});
