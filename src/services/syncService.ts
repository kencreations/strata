import { getDatabase } from '../db/database';
import { api } from './authService';
import type { SyncQueueEntry } from '../db/types';

export type SyncStatus = 'synced' | 'pending' | 'offline';

// ─── Status ───────────────────────────────────────────────────────────────────

export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sync_queue`
    );
    const pending = (row?.cnt ?? 0) > 0;
    if (pending) return 'pending';
    return 'synced';
  } catch {
    return 'offline';
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM sync_queue`
  );
  return row?.cnt ?? 0;
}

// ─── Push local changes → server ──────────────────────────────────────────────

export async function pushPendingChanges(): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 100`
  );
  if (rows.length === 0) return true;

  const entries: SyncQueueEntry[] = rows.map((r: any) => ({
    id: r.id,
    tableName: r.table_name,
    operation: r.operation,
    recordId: r.record_id,
    payload: r.payload,
    createdAt: r.created_at,
  }));

  try {
    await api.post('/sync/push', { changes: entries });

    // Clear processed entries
    const ids = entries.map((e) => `'${e.id}'`).join(',');
    await db.execAsync(`DELETE FROM sync_queue WHERE id IN (${ids})`);
    return true;
  } catch (err) {
    console.warn('[Sync] Push failed:', err);
    return false;
  }
}

// ─── Pull remote changes → local ─────────────────────────────────────────────

export async function pullRemoteChanges(
  lastSyncedAt: string
): Promise<{ newLastSyncedAt: string; changeCount: number }> {
  try {
    const { data } = await api.get<{
      changes: Array<{
        tableName: string;
        operation: 'INSERT' | 'UPDATE' | 'DELETE';
        recordId: string;
        payload: Record<string, any>;
        updatedAt: string;
      }>;
      serverTime: string;
    }>(`/sync/pull?since=${encodeURIComponent(lastSyncedAt)}`);

    const db = await getDatabase();
    for (const change of data.changes) {
      await applyRemoteChange(db, change);
    }

    return {
      newLastSyncedAt: data.serverTime,
      changeCount: data.changes.length,
    };
  } catch (err) {
    console.warn('[Sync] Pull failed:', err);
    return { newLastSyncedAt: lastSyncedAt, changeCount: 0 };
  }
}

// ─── Full sync cycle ──────────────────────────────────────────────────────────

export async function runSync(lastSyncedAt: string): Promise<string> {
  const pushOk = await pushPendingChanges();
  if (!pushOk) return lastSyncedAt;
  const { newLastSyncedAt } = await pullRemoteChanges(lastSyncedAt);
  return newLastSyncedAt;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function applyRemoteChange(
  db: any,
  change: {
    tableName: string;
    operation: string;
    recordId: string;
    payload: Record<string, any>;
  }
): Promise<void> {
  const { tableName, operation, recordId, payload } = change;

  if (operation === 'DELETE') {
    await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [recordId]);
    return;
  }

  // Convert camelCase payload keys to snake_case for SQLite
  const snakePayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    snakePayload[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
  }

  const cols = Object.keys(snakePayload).join(', ');
  const placeholders = Object.keys(snakePayload)
    .map(() => '?')
    .join(', ');
  const values = Object.values(snakePayload);
  const updates = Object.keys(snakePayload)
    .map((k) => `${k} = excluded.${k}`)
    .join(', ');

  await db.runAsync(
    `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    values
  );
}
