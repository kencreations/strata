import { Router } from "express";

const router = Router();

type ParsedCourse = {
    courseName: string;
    days: number[];
    startTime: string;
    endTime: string;
    location: string;
    layerType: "academic" | "work" | "routine";
};

const DAY_MAP: Array<[RegExp, number]> = [
    [/\bsun(?:day)?\b/i, 0],
    [/\bmon(?:day)?\b/i, 1],
    [/\btue(?:sday)?\b/i, 2],
    [/\bwed(?:nesday)?\b/i, 3],
    [/\bthu(?:rsday)?\b/i, 4],
    [/\bfri(?:day)?\b/i, 5],
    [/\bsat(?:urday)?\b/i, 6],
];

const TIME_RANGE_RE =
    /(?<start>\d{1,2}:\d{2}\s?[AP]M)\s*[\-–]\s*(?<end>\d{1,2}:\d{2}\s?[AP]M)/i;
const COURSE_RE = /\b([A-Z]{2,}\s?\d{2,4})\b/;

// POST /api/v1/schedule/parse-document
router.post("/parse-document", async (req, res) => {
    try {
        const { base64, fileName } = req.body ?? {};

        if (typeof base64 !== "string" || base64.length === 0) {
            return res
                .status(400)
                .json({ message: "base64 file content is required" });
        }

        const buffer = Buffer.from(base64, "base64");
        const text = await extractPdfText(buffer);
        const courses = parseCourses(text, fileName);

        res.json({ courses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to parse schedule document." });
    }
});

async function extractPdfText(buffer: Buffer): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const items = textContent.items as Array<{ str?: string }>;
        const pageText = items.map((item) => item.str ?? "").join(" ");
        pages.push(pageText);
    }

    return pages.join("\n");
}

function parseCourses(text: string, fileName?: string): ParsedCourse[] {
    const normalized = text.replace(/\s+/g, " ").trim();
    const tokens = normalized.split(/\s+/);
    const courses: ParsedCourse[] = [];

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index] ?? "";
        const nextTokens = tokens.slice(index, index + 10).join(" ");
        const timeMatch = nextTokens.match(TIME_RANGE_RE);
        const courseMatch =
            token.match(COURSE_RE) ?? nextTokens.match(COURSE_RE);

        if (!timeMatch || !courseMatch) {
            continue;
        }

        const day = findNearestDay(tokens, index);
        const location = extractLocation(nextTokens);
        const layerType = inferLayerType(courseMatch[1], location, fileName);

        courses.push({
            courseName: courseMatch[1],
            days: day != null ? [day] : [1],
            startTime: normalizeTime(timeMatch.groups?.start ?? "09:00 AM"),
            endTime: normalizeTime(timeMatch.groups?.end ?? "10:30 AM"),
            location,
            layerType,
        });
    }

    if (courses.length > 0) {
        return dedupeCourses(courses);
    }

    const fallbackCourse = fallbackFromText(normalized, fileName);
    return fallbackCourse ? [fallbackCourse] : [];
}

function findNearestDay(tokens: string[], startIndex: number): number | null {
    const windowStart = Math.max(0, startIndex - 8);
    const windowTokens = tokens.slice(windowStart, startIndex + 8).join(" ");

    for (const [pattern, day] of DAY_MAP) {
        if (pattern.test(windowTokens)) {
            return day;
        }
    }

    return null;
}

function extractLocation(text: string): string {
    const onlineMatch = text.match(/\bONLINE\b/i);
    if (onlineMatch) return "ONLINE";

    const roomMatch = text.match(/RM\s*\d+[\w\s()\-]*/i);
    if (roomMatch) return roomMatch[0].trim();

    return "TBD";
}

function inferLayerType(
    courseName: string,
    location: string,
    fileName?: string,
): ParsedCourse["layerType"] {
    const haystack =
        `${courseName} ${location} ${fileName ?? ""}`.toLowerCase();
    if (haystack.includes("work")) return "work";
    if (haystack.includes("routine")) return "routine";
    return "academic";
}

function normalizeTime(input: string): string {
    const match = input.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) return input.trim();

    const hour = Number(match[1]);
    const minute = match[2];
    const period = match[3].toUpperCase();
    let normalizedHour = hour % 12;

    if (period === "PM") normalizedHour += 12;
    if (period === "AM" && hour === 12) normalizedHour = 0;

    return `${String(normalizedHour).padStart(2, "0")}:${minute}`;
}

function dedupeCourses(courses: ParsedCourse[]): ParsedCourse[] {
    const seen = new Set<string>();
    const output: ParsedCourse[] = [];

    for (const course of courses) {
        const key = [
            course.courseName,
            course.days.join(","),
            course.startTime,
            course.endTime,
            course.location,
        ].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(course);
    }

    return output;
}

function fallbackFromText(
    text: string,
    fileName?: string,
): ParsedCourse | null {
    const courseMatch = text.match(COURSE_RE) ?? fileName?.match(COURSE_RE);
    const timeMatch = text.match(TIME_RANGE_RE);
    const courseName =
        courseMatch?.[1] ?? titleizeFileName(fileName) ?? "Extracted Course";
    const location = extractLocation(text);

    return {
        courseName,
        days: [1, 3],
        startTime: normalizeTime(timeMatch?.groups?.start ?? "09:00 AM"),
        endTime: normalizeTime(timeMatch?.groups?.end ?? "10:30 AM"),
        location,
        layerType: "academic",
    };
}

function titleizeFileName(fileName?: string): string | null {
    if (!fileName) return null;
    const withoutExt = fileName.replace(/\.[^.]+$/, "");
    const parts = withoutExt
        .split(/[_\-\s]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map(
            (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        );

    return parts.length > 0 ? parts.join(" ") : null;
}

export default router;
