import { getDatabase, generateId, enqueueSyncChange } from '../database';
import type { Flashcard, SM2Result, FlashcardRating } from '../types';

// ─── SM-2 Algorithm ───────────────────────────────────────────────────────────
/**
 * SuperMemo-2 algorithm.
 * rating: 0=Hard, 1=Good, 2=Easy
 */
export function calculateSM2(card: Flashcard, rating: FlashcardRating): SM2Result {
  // Map 0/1/2 to SM-2 quality scores 0-5
  const quality = rating === 0 ? 1 : rating === 1 ? 3 : 5;

  let { easeFactor, interval, repetitions } = card;

  if (quality < 3) {
    // Incorrect / Hard → reset repetitions, short interval
    repetitions = 0;
    interval = 1;
  } else {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor (min 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview: nextReview.toISOString().slice(0, 10),
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Flashcards where next_review is today or earlier — due for review. */
export async function getCardsDueToday(): Promise<Flashcard[]> {
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM flashcards WHERE next_review <= ? ORDER BY next_review ASC`,
    [today]
  );
  return rows.map(rowToCard);
}

/** All flashcards linked to a specific document. */
export async function getCardsByDocument(documentId: string): Promise<Flashcard[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM flashcards WHERE document_id = ?`,
    [documentId]
  );
  return rows.map(rowToCard);
}

/** Count of cards due today (for widget/badge). */
export async function getDueCount(): Promise<number> {
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM flashcards WHERE next_review <= ?`,
    [today]
  );
  return row?.cnt ?? 0;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Update a card's SM-2 fields after the user rates it. */
export async function updateCardAfterReview(
  id: string,
  result: SM2Result
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE flashcards
     SET ease_factor = ?, interval = ?, repetitions = ?, next_review = ?
     WHERE id = ?`,
    [result.easeFactor, result.interval, result.repetitions, result.nextReview, id]
  );
  await enqueueSyncChange('flashcards', 'UPDATE', id, result);
}

/** Bulk-insert AI-generated flashcards linked to a document. */
export async function insertFlashcards(
  documentId: string,
  cards: Array<{ question: string; answer: string }>
): Promise<void> {
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);

  for (const card of cards) {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO flashcards (id, document_id, question, answer, ease_factor, interval, repetitions, next_review)
       VALUES (?, ?, ?, ?, 2.5, 0, 0, ?)`,
      [id, documentId, card.question, card.answer, today]
    );
    await enqueueSyncChange('flashcards', 'INSERT', id, {
      id,
      documentId,
      ...card,
    });
  }
}

/** Delete all cards for a document (e.g., when re-generating). */
export async function deleteCardsByDocument(documentId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM flashcards WHERE document_id = ?`,
    [documentId]
  );
}

// ─── Internal ─────────────────────────────────────────────────────────────────
function rowToCard(row: any): Flashcard {
  return {
    id: row.id,
    documentId: row.document_id,
    question: row.question,
    answer: row.answer,
    easeFactor: row.ease_factor,
    interval: row.interval,
    repetitions: row.repetitions,
    nextReview: row.next_review,
  };
}
