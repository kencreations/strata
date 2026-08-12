import { create } from 'zustand';
import type { VaultDocument, ParsedCourseItem } from '../db/types';
import { getAllDocuments, insertDocument, deleteDocument, clearAllDocuments } from '../db/repositories/vaultRepository';
import { insertFlashcards, deleteCardsByDocument } from '../db/repositories/flashcardRepository';
import {
  pickDocument,
  parseDocument,
  generateFlashcardsFromDocument,
} from '../ai/parser';
import { generateId } from '../db/database';
import { GUEST_USER_ID } from '../db/migrations';

interface VaultState {
  documents: VaultDocument[];
  parsedCourses: ParsedCourseItem[];
  isPickingDocument: boolean;
  isProcessing: boolean;
  processingStatus: string;
  error: string | null;

  // Actions
  loadDocuments: (userId?: string) => Promise<void>;
  pickAndParse: () => Promise<ParsedCourseItem[] | null>;
  generateStudySet: (documentId: string) => Promise<number>;
  clearParsed: () => void;
  removeDocument: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  documents: [],
  parsedCourses: [],
  isPickingDocument: false,
  isProcessing: false,
  processingStatus: '',
  error: null,

  loadDocuments: async (userId = GUEST_USER_ID) => {
    const documents = await getAllDocuments(userId);
    set({ documents });
  },

  pickAndParse: async () => {
    set({ isPickingDocument: true, error: null });
    try {
      const file = await pickDocument();
      if (!file) {
        set({ isPickingDocument: false });
        return null;
      }

      set({ isPickingDocument: false, isProcessing: true, processingStatus: 'Saving file…' });

      set({ processingStatus: 'Reading with AI…' });
      const parsed = await parseDocument(file);

      // Do NOT insert schedule PDFs into the vault_documents table.

      set({ parsedCourses: parsed });
      return parsed;
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to process document' });
      return null;
    } finally {
      set({ isProcessing: false, processingStatus: '' });
    }
  },

  generateStudySet: async (documentId) => {
    set({ isProcessing: true, processingStatus: 'Generating flashcards…' });
    try {
      // First clear existing cards for this doc to avoid dupes on re-generate
      await deleteCardsByDocument(documentId);

      // Generate from mock (or real LLM post-eject)
      const cards = await generateFlashcardsFromDocument('', documentId);
      await insertFlashcards(documentId, cards);

      return cards.length;
    } catch (e: any) {
      set({ error: e.message ?? 'Generation failed' });
      return 0;
    } finally {
      set({ isProcessing: false, processingStatus: '' });
    }
  },

  clearParsed: () => set({ parsedCourses: [] }),

  removeDocument: async (id: string) => {
    try {
      await deleteDocument(id);
      set((state) => ({ documents: state.documents.filter(d => d.id !== id) }));
    } catch (e) {
      console.error('Failed to delete document:', e);
    }
  },

  clearAll: async () => {
    try {
      await clearAllDocuments();
      set({ documents: [] });
    } catch (e) {
      console.error('Failed to clear vault:', e);
    }
  },
}));
