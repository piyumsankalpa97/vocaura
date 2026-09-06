import { ObjectiveMetrics } from "./evaluation-schema";

export const COMMON_FILLERS = [
  "um",
  "uh",
  "er",
  "ah",
  "like",
  "basically",
  "actually",
  "you know",
  "i mean",
  "sort of",
  "kind of",
];

export interface SegmentTimestamp {
  id?: number;
  start: number;
  end: number;
  text: string;
}

export function countFillers(text: string): { total: number; occurrences: Record<string, number> } {
  if (!text || text.trim() === "") {
    return { total: 0, occurrences: {} };
  }

  const occurrences: Record<string, number> = {};
  let total = 0;
  const lowerText = text.toLowerCase();

  for (const filler of COMMON_FILLERS) {
    // Word boundary matching
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      occurrences[filler] = matches.length;
      total += matches.length;
    }
  }

  return { total, occurrences };
}

export function calculatePaceWpm(wordCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || wordCount <= 0) return 0;
  const minutes = durationSeconds / 60;
  return Math.round(wordCount / minutes);
}

export function detectLongPauses(
  segments?: SegmentTimestamp[] | null,
  pauseThresholdSeconds: number = 2.0
): number {
  if (!segments || segments.length < 2) return 0;

  let longPauses = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    const currentEnd = segments[i].end;
    const nextStart = segments[i + 1].start;
    const pause = nextStart - currentEnd;
    if (pause >= pauseThresholdSeconds) {
      longPauses++;
    }
  }

  return longPauses;
}

export function computeObjectiveMetrics(params: {
  transcriptText: string;
  durationSeconds?: number | null;
  segments?: SegmentTimestamp[] | null;
}): ObjectiveMetrics {
  const { transcriptText, durationSeconds = 0, segments } = params;

  // Word count: split on whitespace
  const words = transcriptText.trim().split(/\s+/).filter(Boolean);
  const word_count = words.length;

  const duration = Math.max(0, durationSeconds || 0);
  const wpm = calculatePaceWpm(word_count, duration);
  const { total: filler_count } = countFillers(transcriptText);
  const long_pause_count = detectLongPauses(segments);

  return {
    word_count,
    duration_seconds: Math.round(duration * 10) / 10,
    wpm,
    filler_count,
    long_pause_count,
  };
}
