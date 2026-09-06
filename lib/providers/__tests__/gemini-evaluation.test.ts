import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiEvaluationProvider } from "../gemini-evaluation";
import { LanguageEvaluationInput } from "../language-evaluation";

// Mock the AI SDK generateObject
vi.mock("ai", () => {
  return {
    generateObject: vi.fn(),
  };
});

// Mock @ai-sdk/google
vi.mock("@ai-sdk/google", () => {
  return {
    createGoogleGenerativeAI: vi.fn(() => {
      return vi.fn((modelName: string) => ({ modelId: modelName }));
    }),
  };
});

import { generateObject } from "ai";

describe("GeminiEvaluationProvider", () => {
  let provider: GeminiEvaluationProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiEvaluationProvider("test-gemini-key", "gemini-3.6-flash");
  });

  const mockInput: LanguageEvaluationInput = {
    role: "Software Engineer",
    professional_context: "Sprint retrospective meeting",
    category: "Technical communication",
    scenario: "Explain why the deployment was delayed",
    current_focus: "Filler word reduction",
    known_mistakes: ["preposition_work_on"],
    objective_metrics: {
      word_count: 50,
      duration_seconds: 30,
      wpm: 100,
      filler_count: 4,
      long_pause_count: 1,
    },
    transcript: "Actually, we had some issues with the database migration, like basically it timed out.",
  };

  const sampleModelOutput = {
    overall_score: 50, // This should get recalculated deterministically
    summary: "Clear explanation of the delay, but filler words slightly undermined authority.",
    scores: {
      fluency: 70, // 70 * 0.20 = 14
      grammar: 80, // 80 * 0.15 = 12
      vocabulary: 75, // 75 * 0.10 = 7.5
      clarity: 80, // 80 * 0.20 = 16
      professionalism: 70, // 70 * 0.15 = 10.5
      structure: 80, // 80 * 0.10 = 8
      filler_control: 60, // 60 * 0.10 = 6 => total = 74
    },
    objective_metrics: {
      word_count: 999, // Should be overridden by TypeScript deterministic metrics
      duration_seconds: 999,
      wpm: 999,
      filler_count: 999,
      long_pause_count: 999,
    },
    strengths: [
      "Directly addressed the cause of the delay without deflecting.",
      "Good technical terminology used accurately.",
    ],
    improvements: [
      {
        priority: "high" as const,
        issue: "Distracting filler words",
        evidence: "actually, like, basically",
        recommendation: "Take a breath before stating the primary cause.",
      },
    ],
    corrections: [
      {
        heard: "we had some issues with",
        better: "we encountered issues during",
        why: "More formal and professional for a post-incident retrospective.",
      },
    ],
    recurring_mistakes: [
      {
        canonical_key: "filler_word_basically",
        type: "filler",
        severity: "medium" as const,
        example: "like basically it timed out",
      },
    ],
    retry_task: {
      instruction: "Restate the delay explanation without using 'like' or 'basically'.",
      focus: "Pacing and filler elimination",
    },
    pronunciation_note:
      "Pronunciation was not scored in this session. The current analysis focuses on language and communication.",
  };

  it("successfully transforms and validates Gemini structured output", async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: sampleModelOutput,
      usage: {
        inputTokens: 400,
        outputTokens: 300,
        totalTokens: 700,
      },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const result = await provider.evaluate(mockInput);

    expect(result.modelProvider).toBe("google");
    expect(result.modelName).toBe("gemini-3.6-flash");
    expect(result.rawUsage?.totalTokens).toBe(700);

    // Verify deterministic recalculation of overall score:
    // 14 + 12 + 7.5 + 16 + 10.5 + 8 + 6 = 74
    expect(result.evaluation.overall_score).toBe(74);

    // Verify deterministic objective metrics overwrite model hallucinations
    expect(result.evaluation.objective_metrics.word_count).toBe(50);
    expect(result.evaluation.objective_metrics.duration_seconds).toBe(30);
    expect(result.evaluation.objective_metrics.wpm).toBe(100);
    expect(result.evaluation.objective_metrics.filler_count).toBe(4);
    expect(result.evaluation.objective_metrics.long_pause_count).toBe(1);

    // Verify feedback content
    expect(result.evaluation.strengths.length).toBe(2);
    expect(result.evaluation.improvements.length).toBe(1);
    expect(result.evaluation.corrections[0].heard).toBe("we had some issues with");
    expect(result.evaluation.recurring_mistakes[0].canonical_key).toBe("filler_word_basically");
  });

  it("propagates error when Gemini API call fails", async () => {
    vi.mocked(generateObject).mockRejectedValue(new Error("Gemini API quota exceeded"));

    await expect(provider.evaluate(mockInput)).rejects.toThrow("Gemini API quota exceeded");
  });

  it("throws validation error if Gemini output violates required schema structure", async () => {
    const invalidOutput = {
      ...sampleModelOutput,
      scores: {
        ...sampleModelOutput.scores,
        fluency: 150, // Invalid: exceeds max 100
      },
    };

    vi.mocked(generateObject).mockResolvedValue({
      object: invalidOutput,
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    await expect(provider.evaluate(mockInput)).rejects.toThrow();
  });
});
