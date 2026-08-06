import * as SQLite from 'expo-sqlite';
import {
  MIGRATIONS,
  GUEST_USER_ID,
} from './migrations';

const DB_NAME = 'strata.db';
const SEED_VERSION_KEY = 'seed_v1_done';

// ─── Singleton database handle ────────────────────────────────────────────────
let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  return _db;
}

// ─── Initialize schema and optional seed data ─────────────────────────────────
export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  // Run all migrations as a single batch
  await db.execAsync(MIGRATIONS);

  // Seed once — check if already done via a settings table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const seedRow = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = ?`,
    [SEED_VERSION_KEY]
  );

  if (!seedRow) {
    // Guest user (offline mode — no auth required initially)
    await db.runAsync(
      `INSERT OR IGNORE INTO users
         (id, email, password_hash, full_name, role, auth_provider, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        GUEST_USER_ID,
        'guest@strata.app',
        '',
        'Alex Chen',
        'student',
        'email',
        'synced',
      ]
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`,
      [SEED_VERSION_KEY, '1']
    );
  }
}

// ─── Utility: generate UUID v4 without external deps ─────────────────────────
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Utility: enqueue a change for sync ──────────────────────────────────────
export async function enqueueSyncChange(
  tableName: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  recordId: string,
  payload: object
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, table_name, operation, record_id, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [generateId(), tableName, operation, recordId, JSON.stringify(payload)]
  );
}
