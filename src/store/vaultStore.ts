import { create } from 'zustand';
import type { VaultDocument, ParsedCourse } from '../db/types';
import { getAllDocuments, insertDocument } from '../db/repositories/vaultRepository';
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
  parsedCourses: ParsedCourse[];
  isPickingDocument: boolean;
  isProcessing: boolean;
  processingStatus: string;
  error: string | null;

  // Actions
  loadDocuments: (userId?: string) => Promise<void>;
  pickAndParse: () => Promise<ParsedCourse[] | null>;
  generateStudySet: (documentId: string) => Promise<number>;
  clearParsed: () => void;
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

      // Save document record
      const docId = await insertDocument({
        userId: GUEST_USER_ID,
        fileName: file.name,
        filePath: file.uri,
        fileType: file.mimeType,
      });

      set({ processingStatus: 'Reading with AI…' });
      const parsed = await parseDocument(file);

      // Reload documents
      await get().loadDocuments();

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
}));
