import { AppState, AppStateStatus } from 'react-native';
import { create } from 'zustand';
import { getCardsDueToday, updateCardAfterReview, calculateSM2 } from '../db/repositories/flashcardRepository';
import type { Flashcard, FlashcardRating } from '../db/types';

// ─── Pomodoro State Machine ───────────────────────────────────────────────────

export type TimerPhase = 'IDLE' | 'FOCUSING' | 'BREAK' | 'PAUSED' | 'DONE';

export const POMODORO_FOCUS_SECONDS = 25 * 60; // 25 minutes
export const POMODORO_BREAK_SECONDS = 5 * 60;  // 5 minutes

export interface SessionStats {
  cardsReviewed: number;
  correctCount: number;  // Good or Easy ratings
  hardCount: number;
  pomodorosCompleted: number;
}

interface StudyState {
  // Timer
  phase: TimerPhase;
  timeLeft: number;          // seconds
  focusSubject?: string;

  // Flashcards
  cards: Flashcard[];
  currentIndex: number;
  isFlipped: boolean;
  isLoadingCards: boolean;

  // Stats
  stats: SessionStats;

  // Actions
  loadCards: () => Promise<void>;
  startFocus: (subject?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipBreak: () => void;
  tick: () => void;
  flipCard: () => void;
  rateCard: (rating: FlashcardRating) => Promise<void>;
  nextCard: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  phase: 'IDLE',
  timeLeft: POMODORO_FOCUS_SECONDS,
  cards: [],
  currentIndex: 0,
  isFlipped: false,
  isLoadingCards: false,
  stats: { cardsReviewed: 0, correctCount: 0, hardCount: 0, pomodorosCompleted: 0 },

  loadCards: async () => {
    set({ isLoadingCards: true });
    try {
      const cards = await getCardsDueToday();
      set({ cards, currentIndex: 0, isFlipped: false });
    } finally {
      set({ isLoadingCards: false });
    }
  },

  startFocus: (subject) => {
    set({ phase: 'FOCUSING', timeLeft: POMODORO_FOCUS_SECONDS, focusSubject: subject });
    startInterval();
  },

  pauseTimer: () => {
    stopInterval();
    set({ phase: 'PAUSED' });
  },

  resumeTimer: () => {
    const { phase } = get();
    if (phase !== 'PAUSED') return;
    set({ phase: 'FOCUSING' });
    startInterval();
  },

  resetTimer: () => {
    stopInterval();
    set({ phase: 'IDLE', timeLeft: POMODORO_FOCUS_SECONDS, isFlipped: false });
  },

  skipBreak: () => {
    stopInterval();
    set({ phase: 'FOCUSING', timeLeft: POMODORO_FOCUS_SECONDS });
    startInterval();
  },

  tick: () => {
    const { timeLeft, phase, stats } = get();
    if (phase !== 'FOCUSING' && phase !== 'BREAK') return;

    if (timeLeft <= 1) {
      stopInterval();
      if (phase === 'FOCUSING') {
        // Transition to break
        set({
          phase: 'BREAK',
          timeLeft: POMODORO_BREAK_SECONDS,
          stats: { ...stats, pomodorosCompleted: stats.pomodorosCompleted + 1 },
        });
        startInterval();
      } else {
        // Break done
        set({ phase: 'DONE', timeLeft: 0 });
      }
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  flipCard: () => set((s) => ({ isFlipped: !s.isFlipped })),

  rateCard: async (rating) => {
    const { cards, currentIndex, stats } = get();
    const card = cards[currentIndex];
    if (!card) return;

    const result = calculateSM2(card, rating);
    await updateCardAfterReview(card.id, result);

    set({
      stats: {
        ...stats,
        cardsReviewed: stats.cardsReviewed + 1,
        correctCount: stats.correctCount + (rating >= 1 ? 1 : 0),
        hardCount: stats.hardCount + (rating === 0 ? 1 : 0),
      },
      isFlipped: false,
    });

    // Auto-advance to next card
    get().nextCard();
  },

  nextCard: () => {
    const { cards, currentIndex } = get();
    if (currentIndex < cards.length - 1) {
      set({ currentIndex: currentIndex + 1, isFlipped: false });
    }
  },
}));

// ─── Interval management (outside Zustand to avoid serialization issues) ──────
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let _pausedAt: number | null = null;

function startInterval() {
  stopInterval();
  _intervalId = setInterval(() => {
    useStudyStore.getState().tick();
  }, 1000);

  // Pause timer when app goes to background, resume on foreground
  _appStateSubscription = AppState.addEventListener(
    'change',
    (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        _pausedAt = Date.now();
        stopInterval();
      } else if (state === 'active' && _pausedAt !== null) {
        // Fast-forward the timer by elapsed seconds
        const elapsed = Math.floor((Date.now() - _pausedAt) / 1000);
        const { timeLeft, phase } = useStudyStore.getState();
        if (phase === 'FOCUSING' || phase === 'BREAK') {
          const newTime = Math.max(0, timeLeft - elapsed);
          useStudyStore.setState({ timeLeft: newTime });
          if (newTime <= 0) {
            useStudyStore.getState().tick(); // Trigger phase transition
          } else {
            startInterval();
          }
        }
        _pausedAt = null;
      }
    }
  );
}

function stopInterval() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_appStateSubscription) {
    _appStateSubscription.remove();
    _appStateSubscription = null;
  }
}
