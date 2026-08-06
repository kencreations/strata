// ─── SQLite Migrations ────────────────────────────────────────────────────────
// All CREATE TABLE statements run on app boot via initializeDatabase().
// Each statement uses IF NOT EXISTS — safe to re-run on every launch.

export const MIGRATIONS = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'student',
    auth_provider TEXT NOT NULL DEFAULT 'email',
    external_id   TEXT,
    sync_status   TEXT NOT NULL DEFAULT 'synced',
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Schedule layers (Academic / Work / Routine)
  CREATE TABLE IF NOT EXISTS schedule_layers (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    layer_name  TEXT NOT NULL,
    color_code  TEXT NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Calendar events
  CREATE TABLE IF NOT EXISTS events (
    id           TEXT PRIMARY KEY,
    layer_id     TEXT NOT NULL,
    title        TEXT NOT NULL,
    location     TEXT,
    start_time   TEXT NOT NULL,
    end_time     TEXT NOT NULL,
    days_of_week TEXT NOT NULL DEFAULT '[]',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (layer_id) REFERENCES schedule_layers(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
  CREATE INDEX IF NOT EXISTS idx_events_layer_id ON events(layer_id);

  -- Schedule conflicts
  CREATE TABLE IF NOT EXISTS conflicts (
    id          TEXT PRIMARY KEY,
    event_id_1  TEXT NOT NULL,
    event_id_2  TEXT NOT NULL,
    is_resolved INTEGER NOT NULL DEFAULT 0,
    resolved_at TEXT,
    FOREIGN KEY (event_id_1) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id_2) REFERENCES events(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON conflicts(is_resolved);

  -- Vault documents
  CREATE TABLE IF NOT EXISTS vault_documents (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    course_id   TEXT,
    file_name   TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    file_type   TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Flashcards (SM-2 fields)
  CREATE TABLE IF NOT EXISTS flashcards (
    id           TEXT PRIMARY KEY,
    document_id  TEXT NOT NULL,
    question     TEXT NOT NULL,
    answer       TEXT NOT NULL,
    ease_factor  REAL NOT NULL DEFAULT 2.5,
    interval     INTEGER NOT NULL DEFAULT 0,
    repetitions  INTEGER NOT NULL DEFAULT 0,
    next_review  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
    FOREIGN KEY (document_id) REFERENCES vault_documents(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);

  -- Offline sync queue
  CREATE TABLE IF NOT EXISTS sync_queue (
    id         TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation  TEXT NOT NULL,
    record_id  TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;

// ─── Default seed data ────────────────────────────────────────────────────────
// Seeded once when the guest/anonymous user profile is created on first launch.

export const GUEST_USER_ID = 'guest-00000000-0000-0000-0000-000000000001';

// Mock data arrays have been removed to ensure empty states are rendered correctly.
