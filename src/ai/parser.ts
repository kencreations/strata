import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { api } from "../services/authService";
import type { ParsedCourseItem } from "../db/types";

// ─── Document Picker ──────────────────────────────────────────────────────────

export interface PickedFile {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
}

/**
 * Opens the native document picker for PDF or image files.
 * Returns null if user cancels.
 */
export async function pickDocument(): Promise<PickedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
    });

    if (result.canceled || result.assets.length === 0) return null;

    const asset = result.assets[0];
    return {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
        size: asset.size,
    };
}

// ─── AI Parser Pipeline ───────────────────────────────────────────────────────
/**
 * Parses a picked document file to extract course schedule data.
 *
 * CURRENT IMPLEMENTATION: Mock/stub returns sample data.
 * ─────────────────────────────────────────────────────
 * TODO (post-eject to bare workflow):
 *   1. Run OCR on the file using `@react-native-ml-kit/text-recognition`
 *   2. Chunk the extracted text (max 2048 tokens per chunk)
 *   3. Pass each chunk to a local quantized LLM:
 *      ```ts
 *      import { Llama } from 'react-native-llama';
 *      const llm = await Llama.createContext({ model: '/models/mistral-7b-q4.gguf' });
 *      const json = await llm.completion({
 *        prompt: PARSE_PROMPT + text,
 *        maxTokens: 512,
 *      });
 *      ```
 *   4. Parse JSON response into ParsedCourse[]
 * ─────────────────────────────────────────────────────
 */
export async function parseDocument(file: PickedFile): Promise<ParsedCourseItem[]> {
    // Simulate processing time
    await new Promise((r) => setTimeout(r, 1500));

    // Return the hardcoded multi-course offline mock array matching sched.pdf
    return [
        {
            id: 'mock-1',
            courseName: 'PHYS 102',
            days: [3, 4], // Wed, Thu
            startTime: '07:00 AM',
            endTime: '10:00 AM',
            location: 'RM 401 (CICS) / RM 103 (CICS)',
            layerId: undefined, // Default to academic later
        },
        {
            id: 'mock-2',
            courseName: 'GED 103',
            days: [1, 4], // Mon, Thu
            startTime: '10:00 AM',
            endTime: '01:00 PM',
            location: 'ONLINE',
            layerId: undefined,
        },
        {
            id: 'mock-3',
            courseName: 'PHYS 102',
            days: [6], // Sat
            startTime: '10:00 AM',
            endTime: '01:00 PM',
            location: 'RM 202 (CICS)',
            layerId: undefined,
        },
        {
            id: 'mock-4',
            courseName: 'PHYS 102',
            days: [2, 5], // Tue, Fri
            startTime: '02:00 PM',
            endTime: '05:00 PM',
            location: 'ONLINE',
            layerId: undefined,
        },
        {
            id: 'mock-5',
            courseName: 'GED 103',
            days: [6], // Sat
            startTime: '02:00 PM',
            endTime: '05:00 PM',
            location: 'RM 201 (CICS)',
            layerId: undefined,
        }
    ];
}

/**
 * Generates flashcard Q&A pairs from document text.
 *
 * TODO (post-eject):
 *   Replace with real LLM prompt:
 *   "Generate 10 flashcards as JSON: [{question, answer}]"
 */
export async function generateFlashcardsFromDocument(
    _documentText: string,
    courseContext?: string,
): Promise<Array<{ question: string; answer: string }>> {
    await new Promise((r) => setTimeout(r, 2000));

    // Mock output
    return [
        {
            question: `What is the fundamental principle of ${courseContext ?? "the course"}?`,
            answer: "The sum of all forces in a static system must equal zero (ΣF = 0).",
        },
        {
            question: "Define a free body diagram.",
            answer: "A diagram that depicts all external forces and moments acting on an isolated object.",
        },
        {
            question: "What is the moment of a force?",
            answer: "The tendency of a force to rotate a body about a point. M = F × d, where d is the perpendicular distance.",
        },
    ];
}

// ─── Prompt template (for when LLM is enabled post-eject) ────────────────────
export const PARSE_PROMPT = `You are a university schedule parser. Extract course schedule data from the following text and return ONLY a valid JSON array with this structure:
[{
  "courseName": string,
  "days": number[],   // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  "startTime": string, // "HH:MM" 24h
  "endTime": string,
  "location": string,
  "layerType": "academic" | "work" | "routine"
}]
Text to parse:\n`;
