import { z } from "zod";

export const transcriptCorrectionSchema = z.object({
  original: z.string().min(1).describe("The exact word or phrase from the transcript that was misheard"),
  corrected: z.string().min(1).describe("The intended proper noun or localized word according to user vocabulary"),
  category: z.string().optional().default("General").describe("Category such as Location, Person, Workplace, etc."),
  reason: z.string().optional().describe("Brief explanation why this was identified as misheard"),
});

export const transcriptOptimizationResultSchema = z.object({
  corrections: z.array(transcriptCorrectionSchema).default([]),
});

export type TranscriptCorrection = z.infer<typeof transcriptCorrectionSchema>;
export type TranscriptOptimizationResult = z.infer<typeof transcriptOptimizationResultSchema>;

/**
 * Escapes regex special characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type CorrectionLike = Pick<TranscriptCorrection, "original" | "corrected"> &
  Partial<TranscriptCorrection>;

/**
 * Splits text into plain pieces and pieces matched by a correction's `original`.
 * Matching is case-insensitive, respects word edges (Unicode-aware), prefers the
 * longest phrase, and runs in a single pass so one correction's output is never
 * re-matched by another.
 */
export function splitTextByCorrections<T extends CorrectionLike>(
  text: string,
  corrections: T[]
): Array<{ text: string; correction?: T }> {
  const byKey = new Map<string, T>();
  for (const correction of corrections) {
    const key = correction.original.trim().toLowerCase();
    if (key && correction.corrected.trim() && !byKey.has(key)) {
      byKey.set(key, correction);
    }
  }

  if (!text || byKey.size === 0) {
    return text ? [{ text }] : [];
  }

  const alternation = Array.from(byKey.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`, "giu");

  const pieces: Array<{ text: string; correction?: T }> = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) pieces.push({ text: text.slice(cursor, index) });
    pieces.push({ text: match[0], correction: byKey.get(match[0].toLowerCase()) });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor) });

  return pieces;
}

/**
 * Safely applies an array of corrections to raw transcript text using word boundaries.
 */
export function applyCorrectionsToText(
  rawText: string,
  corrections: Array<{ original: string; corrected: string }>
): string {
  if (!rawText || !corrections || corrections.length === 0) {
    return rawText;
  }

  return splitTextByCorrections(rawText, corrections)
    .map((piece) => (piece.correction ? piece.correction.corrected.trim() : piece.text))
    .join("");
}

/**
 * Keeps only corrections that actually change a phrase present in the text,
 * one per original phrase. Guards against the model inventing corrections.
 */
export function filterApplicableCorrections(
  text: string,
  corrections: TranscriptCorrection[]
): TranscriptCorrection[] {
  const seen = new Set<string>();
  const result: TranscriptCorrection[] = [];

  for (const correction of corrections) {
    const original = correction.original.trim();
    const corrected = correction.corrected.trim();
    const key = original.toLowerCase();
    if (!original || !corrected || original === corrected || seen.has(key)) continue;

    const found = splitTextByCorrections(text, [{ original, corrected }]).some(
      (piece) => piece.correction
    );
    if (!found) continue;

    seen.add(key);
    result.push({ ...correction, original, corrected });
  }

  return result;
}
