import { describe, it, expect } from "vitest";
import { dailyChallengeSchema } from "../challenge-schema";
import { generateDailyChallengeUserPrompt } from "../prompts";
import { comparisonSchema, evaluationResultSchema } from "../evaluation-schema";

describe("Phase 8 Personalization: Challenge & Comparison Schemas", () => {
  describe("Daily Challenge Schema", () => {
    it("validates valid daily challenge data successfully", () => {
      const validChallenge = {
        title: "Sprint Retrospective Defense",
        reason: "Targets recurring hesitation when justifying technical delays.",
        prompt: "Explain to your engineering manager why database schema migration took longer than anticipated.",
        expected_skill: "concise justification",
        estimated_minutes: 5,
      };

      const result = dailyChallengeSchema.safeParse(validChallenge);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Sprint Retrospective Defense");
        expect(result.data.estimated_minutes).toBe(5);
      }
    });

    it("rejects challenge data missing required fields", () => {
      const invalidChallenge = {
        title: "",
        reason: "Some reason",
        // missing prompt and expected_skill
      };

      const result = dailyChallengeSchema.safeParse(invalidChallenge);
      expect(result.success).toBe(false);
    });
  });

  describe("Daily Challenge Prompt Generation", () => {
    it("injects user role, goals, and weaknesses into user prompt", () => {
      const prompt = generateDailyChallengeUserPrompt({
        role: "Registered Nurse",
        professional_context: "Emergency triage in UK NHS",
        goals: ["Pass OET speaking exam", "Communicate calmly under stress"],
        weaknesses: ["prep_work_on (preposition, seen 4 times)", "hesitation_in_handover"],
        recent_categories: ["Clinical Handover", "Patient Consultation"],
      });

      expect(prompt).toContain("Registered Nurse");
      expect(prompt).toContain("Emergency triage in UK NHS");
      expect(prompt).toContain("Pass OET speaking exam");
      expect(prompt).toContain("prep_work_on");
      expect(prompt).toContain("Clinical Handover");
    });

    it("handles null/empty contextual values with sensible fallbacks", () => {
      const prompt = generateDailyChallengeUserPrompt({
        role: "Software Engineer",
      });

      expect(prompt).toContain("Software Engineer");
      expect(prompt).toContain("Workplace communication");
      expect(prompt).toContain("Professional fluency");
    });
  });

  describe("Retry Comparison Schema", () => {
    it("validates comparison object in evaluation schema", () => {
      const sampleComparison = {
        overall_delta: 6,
        improved: ["Reduced filler words from 8 to 2", "Clearer introduction of architectural components"],
        still_needs_work: ["Slightly rushed conclusion"],
      };

      const result = comparisonSchema.safeParse(sampleComparison);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_delta).toBe(6);
        expect(result.data.improved).toHaveLength(2);
      }
    });

    it("parses full evaluation result containing retry comparison", () => {
      const fullEvaluation = {
        overall_score: 84,
        summary: "Excellent improvement on this retry attempt.",
        scores: {
          fluency: 85,
          grammar: 80,
          vocabulary: 85,
          clarity: 88,
          professionalism: 85,
          structure: 82,
          filler_control: 85,
        },
        objective_metrics: {
          word_count: 140,
          duration_seconds: 70,
          wpm: 120,
          filler_count: 1,
        },
        strengths: ["Confident pace", "Smooth transitions"],
        improvements: [],
        corrections: [],
        recurring_mistakes: [],
        comparison: {
          overall_delta: 12,
          improved: ["Spoke 20 WPM faster with fewer pauses"],
          still_needs_work: ["Elaborate more on the second point"],
        },
      };

      const result = evaluationResultSchema.safeParse(fullEvaluation);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.comparison?.overall_delta).toBe(12);
        expect(result.data.comparison?.improved[0]).toContain("faster");
      }
    });
  });
});
