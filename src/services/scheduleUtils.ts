import type { Event, TimelineItem, Conflict } from '../db/types';
import { getDatabase, generateId } from '../db/database';

// ─── Conflict Detection ───────────────────────────────────────────────────────

/**
 * Detects temporal overlaps between all events passed in.
 * O(n²) comparison — acceptable for typical day schedules (< 20 events).
 * Two events A and B conflict if: A.start < B.end && B.start < A.end
 */
export interface DetectedConflict {
  eventId1: string;
  eventId2: string;
}

export function detectConflicts(events: Event[]): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      const aStart = new Date(a.startTime).getTime();
      const aEnd = new Date(a.endTime).getTime();
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();

      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push({ eventId1: a.id, eventId2: b.id });
      }
    }
  }
  return conflicts;
}

/**
 * Persists newly detected conflicts to SQLite (ignores already-stored ones).
 */
export async function persistConflicts(
  detected: DetectedConflict[]
): Promise<void> {
  if (detected.length === 0) return;
  const db = await getDatabase();

  for (const c of detected) {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM conflicts
       WHERE (event_id_1 = ? AND event_id_2 = ?)
          OR (event_id_1 = ? AND event_id_2 = ?)
         AND is_resolved = 0`,
      [c.eventId1, c.eventId2, c.eventId2, c.eventId1]
    );
    if (!existing) {
      await db.runAsync(
        `INSERT INTO conflicts (id, event_id_1, event_id_2, is_resolved)
         VALUES (?, ?, ?, 0)`,
        [generateId(), c.eventId1, c.eventId2]
      );
    }
  }
}

/** Load all unresolved conflicts from DB. */
export async function getUnresolvedConflicts(): Promise<Conflict[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM conflicts WHERE is_resolved = 0`
  );
  return rows.map((r: any) => ({
    id: r.id,
    eventId1: r.event_id_1,
    eventId2: r.event_id_2,
    isResolved: r.is_resolved,
    resolvedAt: r.resolved_at ?? undefined,
  }));
}

/** Mark a conflict as resolved, with optional strategy. */
export async function resolveConflict(
  conflictId: string,
  strategy: 'keep_first' | 'keep_second' | 'manual' = 'manual'
): Promise<void> {
  const db = await getDatabase();

  if (strategy !== 'manual') {
    // Fetch the conflict
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM conflicts WHERE id = ?`,
      [conflictId]
    );
    if (row) {
      const deleteId =
        strategy === 'keep_first' ? row.event_id_2 : row.event_id_1;
      await db.runAsync(`DELETE FROM events WHERE id = ?`, [deleteId]);
    }
  }

  await db.runAsync(
    `UPDATE conflicts
     SET is_resolved = 1, resolved_at = datetime('now')
     WHERE id = ?`,
    [conflictId]
  );
}

// ─── Timeline Builder ─────────────────────────────────────────────────────────

/**
 * Enriches a list of today's events with conflict flags and active/past status.
 */
export function buildTimeline(
  events: Event[],
  conflicts: DetectedConflict[]
): TimelineItem[] {
  const now = Date.now();
  const conflictSet = new Set(
    conflicts.flatMap((c) => [c.eventId1, c.eventId2])
  );

  return events.map((event) => {
    const start = new Date(event.startTime).getTime();
    const end = new Date(event.endTime).getTime();
    const conflict = conflicts.find(
      (c) => c.eventId1 === event.id || c.eventId2 === event.id
    );

    return {
      ...event,
      hasConflict: conflictSet.has(event.id),
      conflictId: conflict
        ? `${conflict.eventId1}:${conflict.eventId2}`
        : undefined,
      isActive: now >= start && now < end,
      isPast: now >= end,
      // isActive shadows the ScheduleLayer's isActive — rename field
    } as TimelineItem;
  });
}

// ─── Up Next Calculator ───────────────────────────────────────────────────────

/**
 * Returns the next upcoming event (soonest future start or currently active).
 */
export function getUpNextEvent(events: Event[], now = new Date()): Event | null {
  const ts = now.getTime();
  const upcoming = events
    .filter((e) => new Date(e.endTime).getTime() > ts)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  return upcoming[0] ?? null;
}

/**
 * Formats a date string to strict 12-hour format (e.g. "2:00 PM").
 */
export function formatTime12Hour(dateString: string): string {
  const d = new Date(dateString);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 should be 12
  return `${h}:${m} ${ampm}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
}

/**
 * Formats seconds into "X hrs Y mins" or "X mins".
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0 mins';
  let h = Math.floor(seconds / 3600);
  let m = Math.ceil((seconds % 3600) / 60);
  
  if (m === 60) {
    h += 1;
    m = 0;
  }
  
  if (h > 0) {
    if (m === 0) return `${h} hr${h !== 1 ? 's' : ''}`;
    return `${h} hr${h !== 1 ? 's' : ''} ${m} min${m !== 1 ? 's' : ''}`;
  }
  return `${m} min${m !== 1 ? 's' : ''}`;
}

/**
 * Calculates seconds remaining until an event starts from now.
 * Returns 0 if already started.
 */
export function secondsUntilEvent(event: Event, now = new Date()): number {
  const diff = Math.floor(
    (new Date(event.startTime).getTime() - now.getTime()) / 1000
  );
  return Math.max(0, diff);
}
