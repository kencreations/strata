// ─── Database TypeScript Interfaces ──────────────────────────────────────────
// Mirrors the PostgreSQL Prisma schema exactly, mapped to SQLite local storage.

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'student' | 'instructor';
  authProvider: 'email' | 'google' | 'apple';
  externalId?: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  createdAt: string; // ISO8601
  updatedAt: string;
}

export interface ScheduleLayer {
  id: string;
  userId: string;
  layerName: string;
  colorCode: string;
  isActive: 0 | 1; // SQLite stores booleans as integers
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon … 6=Sat

export interface Event {
  id: string;
  layerId: string;
  title: string;
  location?: string;
  startTime: string; // ISO8601 full datetime for single events
  endTime: string;
  daysOfWeek: string; // JSON-encoded DayOfWeek[] for recurring
  isRecurring: 0 | 1;
  createdAt: string;
  // Joined fields (not stored, populated by query)
  layerColor?: string;
  layerName?: string;
}

export interface Conflict {
  id: string;
  eventId1: string;
  eventId2: string;
  isResolved: 0 | 1;
  resolvedAt?: string;
}

export interface VaultDocument {
  id: string;
  userId: string;
  courseId?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  createdAt: string;
}

export type FlashcardRating = 0 | 1 | 2; // 0=Hard, 1=Good, 2=Easy

export interface Flashcard {
  id: string;
  documentId: string;
  question: string;
  answer: string;
  easeFactor: number; // SM-2 ease factor, default 2.5
  interval: number;   // days until next review
  repetitions: number;
  nextReview: string; // ISO8601 date
}

// ─── Sync queue entry stored locally until pushed ────────────────────────────
export interface SyncQueueEntry {
  id: string;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  payload: string; // JSON
  createdAt: string;
}

// ─── Derived / UI-only types ──────────────────────────────────────────────────
export interface TimelineItem extends Event {
  hasConflict: boolean;
  conflictId?: string;
  isActive: boolean; // event is happening right now
  isPast: boolean;
}

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string; // ISO8601 date
}

export interface ParsedCourseItem {
  id: string;
  courseName: string;
  days: DayOfWeek[];
  startTime: string; // "07:00 AM"
  endTime: string;
  location: string;
  layerId?: string; // Default: Academic layer ID
}
