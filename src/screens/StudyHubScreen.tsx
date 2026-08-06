import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { KippPlaceholder } from '../components/KippPlaceholder';
import { Colors, Typography, Spacing } from '../theme';
import { useStudyStore, POMODORO_FOCUS_SECONDS, POMODORO_BREAK_SECONDS } from '../services/studyEngine';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const StudyHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  
  const {
    phase,
    timeLeft,
    cards,
    currentIndex,
    isFlipped,
    loadCards,
    startFocus,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipBreak,
    flipCard: storeFlipCard,
    rateCard,
  } = useStudyStore();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      loadCards();
    }
  }, [isFocused]);

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [isFlipped]);

  useEffect(() => {
    let total = POMODORO_FOCUS_SECONDS;
    if (phase === 'BREAK') total = POMODORO_BREAK_SECONDS;
    
    const progress = 1 - (timeLeft / total);
    Animated.timing(progressAnim, {
      toValue: isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress)),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [timeLeft, phase]);

  const RING_RADIUS = 90;
  const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const RING_SIZE = 220;
  const CENTER = RING_SIZE / 2;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const currentCard = cards[currentIndex];

  const handlePlayPause = () => {
    if (phase === 'IDLE' || phase === 'DONE') startFocus();
    else if (phase === 'PAUSED') resumeTimer();
    else pauseTimer();
  };

  const isRunning = phase === 'FOCUSING' || phase === 'BREAK';

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
        {/* Pomodoro Timer Ring */}
        <View style={styles.timerSection}>
          <TouchableOpacity
            style={styles.timerContainer}
            onPress={handlePlayPause}
            activeOpacity={0.9}
          >
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle cx={CENTER} cy={CENTER} r={RING_RADIUS} stroke={Colors.surfaceContainerHigh} strokeWidth={6} fill="none" />
              <AnimatedCircle
                cx={CENTER}
                cy={CENTER}
                r={RING_RADIUS}
                stroke={phase === 'BREAK' ? Colors.secondary : Colors.primary}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                rotation="-90"
                origin={`${CENTER}, ${CENTER}`}
              />
            </Svg>

            <View style={styles.timerCenter}>
              <Text style={styles.timerLabel}>
                {phase === 'BREAK' ? 'Break Session' : 'Focus Session'}
              </Text>
              <Text style={styles.timerDisplay}>{formatTime(timeLeft)}</Text>
              <View style={[styles.playPauseBtn, isRunning && styles.playPauseBtnActive]}>
                <MaterialIcons
                  name={isRunning ? 'pause' : 'play-arrow'}
                  size={28}
                  color={isRunning ? Colors.onPrimary : Colors.onPrimaryContainer}
                />
              </View>
            </View>

            <View style={styles.kippOnRing}>
              <KippPlaceholder size={40} />
            </View>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} onPress={resetTimer}>
              <MaterialIcons name="replay" size={18} color={Colors.onSurfaceVariant} />
              <Text style={styles.quickBtnText}>Reset</Text>
            </TouchableOpacity>
            <View style={styles.quickDivider} />
            <TouchableOpacity style={styles.quickBtn} onPress={skipBreak}>
              <MaterialIcons name="skip-next" size={18} color={Colors.onSurfaceVariant} />
              <Text style={styles.quickBtnText}>Skip Break</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Flashcard Section */}
        <View style={styles.flashSection}>
          <View style={styles.flashHeader}>
            <View style={styles.flashHeaderLeft}>
              <MaterialIcons name="local-fire-department" size={20} color={Colors.secondaryContainer} />
              <Text style={styles.flashHeaderText}>{cards.length} cards due today</Text>
            </View>
          </View>

          {cards.length > 0 && currentCard ? (
            <TouchableOpacity style={styles.cardWrapper} onPress={storeFlipCard} activeOpacity={0.95}>
              {/* Front */}
              <Animated.View style={[styles.card, { transform: [{ rotateY: frontRotate }] }]}>
                <View style={styles.intentStrip} />
                <MaterialIcons name="style" size={20} color={Colors.outlineVariant} style={styles.cardCornerIcon} />
                <Text style={styles.questionText}>{currentCard.question}</Text>
                <View style={styles.tapHint}>
                  <MaterialIcons name="touch-app" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.tapHintText}>Tap to flip</Text>
                </View>
              </Animated.View>

              {/* Back */}
              <Animated.View style={[styles.card, styles.cardBack, { transform: [{ rotateY: backRotate }] }]}>
                <View style={styles.intentStrip} />
                <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
                  <Text style={styles.answerText}>{currentCard.answer}</Text>
                </ScrollView>
                <View style={styles.ratingRow}>
                  <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: Colors.errorContainer }]} onPress={() => rateCard(0)}>
                    <MaterialIcons name="sentiment-very-dissatisfied" size={22} color={Colors.onErrorContainer} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: Colors.secondaryContainer }]} onPress={() => rateCard(1)}>
                    <MaterialIcons name="sentiment-satisfied" size={22} color={Colors.onSecondaryContainer} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ratingBtn, { backgroundColor: Colors.tertiaryContainer }]} onPress={() => rateCard(2)}>
                    <MaterialIcons name="sentiment-very-satisfied" size={22} color={Colors.onTertiaryContainer} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.card, { height: 200, backgroundColor: Colors.surfaceContainerLowest }]}>
              <MaterialIcons name="done-all" size={48} color={Colors.primary} />
              <Text style={{ ...Typography.headlineSm, color: Colors.onSurface, marginTop: 12 }}>All caught up!</Text>
              <Text style={{ ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginTop: 4 }}>No cards due for review.</Text>
            </View>
          )}

          {/* Deck Progress Dots */}
          {cards.length > 0 && (
            <View style={styles.progressDots}>
              {cards.slice(0, 5).map((_, i) => (
                <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
              ))}
              {cards.length > 5 && <View style={styles.dot} />}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.marginGlobal, gap: Spacing.stackLg, alignItems: 'center' },
  timerSection: { alignItems: 'center', width: '100%', gap: Spacing.stackMd },
  timerContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  timerCenter: { position: 'absolute', alignItems: 'center', gap: 4 },
  timerLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  timerDisplay: { ...Typography.displayLg, color: Colors.onBackground, lineHeight: 40 },
  playPauseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  playPauseBtnActive: { backgroundColor: Colors.primary },
  kippOnRing: { position: 'absolute', bottom: -8 },
  quickActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackLg, opacity: 0.8 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickBtnText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  quickDivider: { width: 1, height: 16, backgroundColor: Colors.outlineVariant, opacity: 0.4 },
  flashSection: { width: '100%', gap: Spacing.stackMd },
  flashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  flashHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashHeaderText: { ...Typography.labelMd, color: Colors.onBackground, fontWeight: '600' },
  cardWrapper: { width: '100%', height: 200 },
  card: { position: 'absolute', width: '100%', height: '100%', backgroundColor: Colors.surfaceContainerLowest, borderRadius: 20, padding: Spacing.stackLg, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4, overflow: 'hidden' },
  cardBack: { backgroundColor: Colors.surfaceContainerLow },
  intentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: Colors.tertiary, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  cardCornerIcon: { position: 'absolute', top: 12, right: 12 },
  questionText: { ...Typography.headlineMd, color: Colors.onBackground, textAlign: 'center', paddingHorizontal: 8 },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto', opacity: 0.5 },
  tapHintText: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  answerText: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 24, paddingHorizontal: 8 },
  ratingRow: { flexDirection: 'row', gap: Spacing.stackMd, marginTop: 'auto' },
  ratingBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  progressDots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.outlineVariant },
  dotActive: { backgroundColor: Colors.primary },
});
