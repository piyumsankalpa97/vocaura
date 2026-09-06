import { describe, it, expect } from "vitest";
import {
  calculateWeightedOverallScore,
  evaluationResultSchema,
  EvaluationScores,
} from "../evaluation-schema";
import {
  countFillers,
  calculatePaceWpm,
  detectLongPauses,
  computeObjectiveMetrics,
} from "../metrics";
import { generateEvaluationUserPrompt } from "../prompts";

describe("Evaluation Logic & Schema", () => {
  describe("calculateWeightedOverallScore", () => {
    it("calculates accurate weighted score according to specification", () => {
      const scores: EvaluationScores = {
        fluency: 80, // 80 * 0.20 = 16
        grammar: 70, // 70 * 0.15 = 10.5
        vocabulary: 90, // 90 * 0.10 = 9
        clarity: 85, // 85 * 0.20 = 17
        professionalism: 75, // 75 * 0.15 = 11.25
        structure: 80, // 80 * 0.10 = 8
        filler_control: 60, // 60 * 0.10 = 6
        // Total = 16 + 10.5 + 9 + 17 + 11.25 + 8 + 6 = 77.75 => round to 78
      };

      const result = calculateWeightedOverallScore(scores);
      expect(result).toBe(78);
    });

    it("clamps boundary scores between 0 and 100", () => {
      const zeroScores: EvaluationScores = {
        fluency: 0,
        grammar: 0,
        vocabulary: 0,
        clarity: 0,
        professionalism: 0,
        structure: 0,
        filler_control: 0,
      };
      expect(calculateWeightedOverallScore(zeroScores)).toBe(0);

      const maxScores: EvaluationScores = {
        fluency: 100,
        grammar: 100,
        vocabulary: 100,
        clarity: 100,
        professionalism: 100,
        structure: 100,
        filler_control: 100,
      };
      expect(calculateWeightedOverallScore(maxScores)).toBe(100);
    });
  });

  describe("Filler word detection", () => {
    it("counts common fillers with case-insensitivity and word boundaries", () => {
      const text = "Um, actually, I basically think that, like, we should avoid this. Um...";
      const result = countFillers(text);

      expect(result.total).toBe(5);
      expect(result.occurrences["um"]).toBe(2);
      expect(result.occurrences["actually"]).toBe(1);
      expect(result.occurrences["basically"]).toBe(1);
      expect(result.occurrences["like"]).toBe(1);
    });

    it("does not match substrings that are not whole words", () => {
      const text = "The umbrella was likely placed in the background.";
      const result = countFillers(text);

      expect(result.total).toBe(0);
      expect(result.occurrences["um"]).toBeUndefined();
      expect(result.occurrences["like"]).toBeUndefined();
    });

    it("handles empty and whitespace-only text safely", () => {
      expect(countFillers("").total).toBe(0);
      expect(countFillers("   \n  ").total).toBe(0);
    });
  });

  describe("Pace and pause metrics", () => {
    it("computes Words Per Minute (WPM) accurately", () => {
      // 120 words in 60 seconds = 120 WPM
      expect(calculatePaceWpm(120, 60)).toBe(120);

      // 60 words in 30 seconds = 120 WPM
      expect(calculatePaceWpm(60, 30)).toBe(120);

      // 150 words in 90 seconds (1.5 min) = 100 WPM
      expect(calculatePaceWpm(150, 90)).toBe(100);

      // Edge cases
      expect(calculatePaceWpm(0, 60)).toBe(0);
      expect(calculatePaceWpm(100, 0)).toBe(0);
    });

    it("detects pauses exceeding threshold between segments", () => {
      const segments = [
        { start: 0.0, end: 2.0, text: "First sentence." },
        { start: 4.5, end: 6.0, text: "Second sentence." }, // 2.5s pause >= 2.0s
        { start: 6.5, end: 8.0, text: "Third sentence." }, // 0.5s pause < 2.0s
        { start: 11.0, end: 12.0, text: "Fourth sentence." }, // 3.0s pause >= 2.0s
      ];

      expect(detectLongPauses(segments, 2.0)).toBe(2);
      expect(detectLongPauses(segments, 3.0)).toBe(1);
    });

    it("combines metrics into objective metrics structure", () => {
      const metrics = computeObjectiveMetrics({
        transcriptText: "Actually, this was a very successful release um for our whole team.",
        durationSeconds: 15,
        segments: [
          { start: 0.0, end: 4.0, text: "Actually, this was a very successful release" },
          { start: 8.0, end: 12.0, text: "um for our whole team." },
        ],
      });

      expect(metrics.word_count).toBe(12);
      expect(metrics.duration_seconds).toBe(15);
      expect(metrics.wpm).toBe(48);
      expect(metrics.filler_count).toBe(2);
      expect(metrics.long_pause_count).toBe(1);
    });
  });

  describe("Prompt generation", () => {
    it("formats user evaluation prompt with all dynamic context", () => {
      const prompt = generateEvaluationUserPrompt({
        role: "Nurse",
        professional_context: "Ward handover in Australian hospital",
        category: "Clinical handover",
        scenario: "ISBAR handover of post-op patient",
        current_focus: "Clarity and conciseness",
        known_mistakes: ["tense_past_continuous"],
        objective_metrics: {
          word_count: 80,
          duration_seconds: 45,
          wpm: 107,
          filler_count: 2,
          long_pause_count: 0,
        },
        transcript: "Patient is recovering well after surgery without acute complications.",
      });

      expect(prompt).toContain("Nurse");
      expect(prompt).toContain("Ward handover in Australian hospital");
      expect(prompt).toContain("ISBAR handover of post-op patient");
      expect(prompt).toContain("tense_past_continuous");
      expect(prompt).toContain("Patient is recovering well");
      expect(prompt).toContain('"word_count": 80');
    });
  });

  describe("Zod evaluation schema validation", () => {
    it("rejects evaluations with missing strengths or out of bounds scores", () => {
      const invalidData = {
        overall_score: 85,
        summary: "Good session",
        scores: {
          fluency: 110, // Invalid: > 100
          grammar: 80,
          vocabulary: 80,
          clarity: 80,
          professionalism: 80,
          structure: 80,
          filler_control: 80,
        },
        objective_metrics: {
          word_count: 100,
          duration_seconds: 60,
          wpm: 100,
          filler_count: 2,
        },
        strengths: [], // Invalid: min(1) required
        improvements: [],
        corrections: [],
        recurring_mistakes: [],
      };

      const parsed = evaluationResultSchema.safeParse(invalidData);
      expect(parsed.success).toBe(false);
    });
  });
});
