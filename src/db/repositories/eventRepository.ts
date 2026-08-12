import { getDatabase, generateId, enqueueSyncChange } from '../database';
import type { Event, TimelineItem } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayDayOfWeek(): number {
  return new Date().getDay(); // 0=Sun … 6=Sat
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getTotalEventCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM events`);
  return result?.count || 0;
}

/**
 * Fetch all events for today: union of non-recurring events today + recurring
 * events whose daysOfWeek includes today's day-of-week.
 */
export async function getTodayEvents(userId: string): Promise<Event[]> {
  const db = await getDatabase();
  const today = todayDateStr();
  const dayOfWeek = todayDayOfWeek();

  const rows = await db.getAllAsync<any>(
    `SELECT e.*, sl.color_code as layerColor, sl.layer_name as layerName
     FROM events e
     JOIN schedule_layers sl ON sl.id = e.layer_id
     WHERE sl.user_id = ?
       AND sl.is_active = 1
       AND (
         (e.is_recurring = 0 AND date(e.start_time) = ?)
         OR
         (e.is_recurring = 1 AND instr(e.days_of_week, ?) > 0)
       )
     ORDER BY e.start_time ASC`,
    [userId, today, String(dayOfWeek)]
  );

  return rows.map(rowToEvent);
}

/**
 * Fetch all events (recurring and single) for the user.
 */
export async function getAllEvents(userId: string): Promise<Event[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT e.*, sl.color_code as layerColor, sl.layer_name as layerName
     FROM events e
     JOIN schedule_layers sl ON sl.id = e.layer_id
     WHERE sl.user_id = ?
       AND sl.is_active = 1
     ORDER BY e.start_time ASC`,
    [userId]
  );
  return rows.map(rowToEvent);
}

/**
 * Fetch events filtered by specific layer IDs.
 */
export async function getEventsByLayers(
  userId: string,
  layerIds: string[]
): Promise<Event[]> {
  if (layerIds.length === 0) return [];
  const db = await getDatabase();
  const placeholders = layerIds.map(() => '?').join(',');
  const today = todayDateStr();
  const dayOfWeek = todayDayOfWeek();

  const rows = await db.getAllAsync<any>(
    `SELECT e.*, sl.color_code as layerColor, sl.layer_name as layerName
     FROM events e
     JOIN schedule_layers sl ON sl.id = e.layer_id
     WHERE sl.user_id = ? AND e.layer_id IN (${placeholders})
       AND (
         (e.is_recurring = 0 AND date(e.start_time) = ?)
         OR
         (e.is_recurring = 1 AND instr(e.days_of_week, ?) > 0)
       )
     ORDER BY e.start_time ASC`,
    [userId, ...layerIds, today, String(dayOfWeek)]
  );

  return rows.map(rowToEvent);
}

/** Get a single event by ID. */
export async function getEventById(id: string): Promise<Event | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT e.*, sl.color_code as layerColor, sl.layer_name as layerName
     FROM events e
     JOIN schedule_layers sl ON sl.id = e.layer_id
     WHERE e.id = ?`,
    [id]
  );
  return row ? rowToEvent(row) : null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function insertEvent(
  event: Omit<Event, 'id' | 'createdAt'>
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO events (id, layer_id, title, location, start_time, end_time, days_of_week, is_recurring)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      event.layerId,
      event.title,
      event.location ?? null,
      event.startTime,
      event.endTime,
      event.daysOfWeek,
      event.isRecurring,
    ]
  );
  await enqueueSyncChange('events', 'INSERT', id, { ...event, id });
  return id;
}

export async function updateEvent(
  id: string,
  patch: Partial<Omit<Event, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase();
  const fields = Object.keys(patch)
    .map((k) => `${camelToSnake(k)} = ?`)
    .join(', ');
  const values = Object.values(patch);
  await db.runAsync(`UPDATE events SET ${fields} WHERE id = ?`, [
    ...values,
    id,
  ]);
  await enqueueSyncChange('events', 'UPDATE', id, patch);
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM events WHERE id = ?`, [id]);
  await enqueueSyncChange('events', 'DELETE', id, { id });
}

export async function clearEventsByLayer(layerId: string): Promise<void> {
  const db = await getDatabase();
  // Mark as sync deleted? For now just simple delete since it's local rewrite
  await db.runAsync(`DELETE FROM events WHERE layer_id = ?`, [layerId]);
}

// ─── Schedule layers ──────────────────────────────────────────────────────────
export async function getScheduleLayers(userId: string) {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    `SELECT * FROM schedule_layers WHERE user_id = ? ORDER BY layer_name`,
    [userId]
  );
}

export async function insertScheduleLayer(
  userId: string,
  layerName: string,
  colorCode: string
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO schedule_layers (id, user_id, layer_name, color_code, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, layerName, colorCode, 1]
  );
  await enqueueSyncChange('schedule_layers', 'INSERT', id, { id, userId, layerName, colorCode, isActive: 1 });
  return id;
}

// ─── Internal ─────────────────────────────────────────────────────────────────
function rowToEvent(row: any): Event {
  return {
    id: row.id,
    layerId: row.layer_id,
    title: row.title,
    location: row.location ?? undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    daysOfWeek: row.days_of_week,
    isRecurring: row.is_recurring,
    createdAt: row.created_at,
    layerColor: row.layerColor,
    layerName: row.layerName,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
