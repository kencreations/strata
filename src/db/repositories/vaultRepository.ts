import { getDatabase, generateId, enqueueSyncChange } from '../database';
import type { VaultDocument } from '../types';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllDocuments(userId: string): Promise<VaultDocument[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM vault_documents WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(rowToDoc);
}

export async function getDocumentById(id: string): Promise<VaultDocument | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM vault_documents WHERE id = ?`,
    [id]
  );
  return row ? rowToDoc(row) : null;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function insertDocument(
  doc: Omit<VaultDocument, 'id' | 'createdAt'>
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO vault_documents (id, user_id, course_id, file_name, file_path, file_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      doc.userId,
      doc.courseId ?? null,
      doc.fileName,
      doc.filePath,
      doc.fileType,
    ]
  );
  await enqueueSyncChange('vault_documents', 'INSERT', id, { ...doc, id });
  return id;
}

export async function linkDocumentToCourse(
  documentId: string,
  courseId: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vault_documents SET course_id = ? WHERE id = ?`,
    [courseId, documentId]
  );
  await enqueueSyncChange('vault_documents', 'UPDATE', documentId, { courseId });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM vault_documents WHERE id = ?`, [id]);
  await enqueueSyncChange('vault_documents', 'DELETE', id, { id });
}

export async function clearAllDocuments(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM vault_documents`);
  // Synchronization logic for bulk delete may vary; for local offline-first we just wipe.
}

// ─── Internal ─────────────────────────────────────────────────────────────────
function rowToDoc(row: any): VaultDocument {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id ?? undefined,
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    createdAt: row.created_at,
  };
}
