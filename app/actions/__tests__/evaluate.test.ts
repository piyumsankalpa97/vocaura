import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateSession } from "../evaluate";

// Mock supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock evaluation provider
const mockEvaluate = vi.fn();
vi.mock("@/lib/providers/gemini-evaluation", () => ({
  getGeminiEvaluationProvider: () => ({
    evaluate: mockEvaluate,
  }),
}));

// Mock mistake intelligence
const mockFetchKnownMistakes = vi.fn().mockResolvedValue(["prep_work_on"]);
const mockSyncEvaluationMistakes = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/ai/mistakes", () => ({
  fetchKnownMistakeKeys: (...args: unknown[]) => mockFetchKnownMistakes(...args),
  syncEvaluationMistakes: (...args: unknown[]) => mockSyncEvaluationMistakes(...args),
}));

describe("evaluateSession action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no user session is found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await evaluateSession("session-123");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unauthorized");
  });

  it("returns error if practice session is not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
          }),
        }),
      }),
    });

    const res = await evaluateSession("session-123");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Practice session not found");
  });

  it("returns error when no transcript is found for session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockSession = { id: "session-123", status: "transcribing", user_id: "user-1" };
    const mockRecording = { id: "rec-123", duration_seconds: 45, transcription_status: "completed" };

    mockFrom.mockImplementation((table: string) => {
      if (table === "practice_sessions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "Software Engineer" } }),
            }),
          }),
        };
      }
      if (table === "recordings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    single: vi.fn().mockResolvedValue({ data: mockRecording, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "transcripts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: null, error: new Error("No transcript") }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await evaluateSession("session-123");
    expect(res.success).toBe(false);
    expect(res.error).toContain("No transcript available to evaluate");
  });

  it("successfully evaluates transcript, persists evaluation, and marks session completed", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockSession = {
      id: "session-123",
      status: "analyzing",
      user_id: "user-1",
      practice_prompts: {
        prompt: "Describe your system design approach.",
        expected_skills: ["Architecture", "Clarity"],
        practice_categories: { name: "System Design" },
      },
    };

    const mockRecording = {
      id: "rec-123",
      duration_seconds: 60,
      transcription_status: "completed",
    };

    const mockTranscript = {
      id: "trans-123",
      text: "I start with requirements, then draw component diagrams.",
      segment_timestamps: [],
    };

    const mockEvaluation = {
      overall_score: 82,
      summary: "Good structured communication.",
      scores: {
        fluency: 80,
        grammar: 85,
        vocabulary: 80,
        clarity: 85,
        professionalism: 80,
        structure: 85,
        filler_control: 80,
      },
      objective_metrics: {
        word_count: 8,
        duration_seconds: 60,
        wpm: 8,
        filler_count: 0,
        long_pause_count: 0,
      },
      strengths: ["Clear logical flow."],
      improvements: [],
      recurring_mistakes: [
        {
          canonical_key: "prep_work_on",
          type: "preposition",
          severity: "medium" as const,
          example: "worked in this project",
        },
      ],
    };

    const updateCalls: Array<{ table: string; data: Record<string, unknown> }> = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === "practice_sessions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
              }),
            }),
          }),
          update: (data: Record<string, unknown>) => {
            updateCalls.push({ table, data });
            return {
              eq: () => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          },
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: "Software Engineer", professional_context: "Backend Team" },
              }),
            }),
          }),
        };
      }
      if (table === "recordings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    single: vi.fn().mockResolvedValue({ data: mockRecording, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "transcripts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockTranscript, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "evaluations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          upsert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "eval-123",
                  session_id: "session-123",
                  overall_score: 82,
                  analysis_json: mockEvaluation,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockEvaluate.mockResolvedValue({
      evaluation: mockEvaluation,
      modelProvider: "google",
      modelName: "gemini-3.6-flash",
    });

    const result = await evaluateSession("session-123");

    expect(result.success).toBe(true);
    expect(result.evaluation?.overall_score).toBe(82);
    expect(mockEvaluate).toHaveBeenCalled();
    expect(mockFetchKnownMistakes).toHaveBeenCalled();
    expect(mockSyncEvaluationMistakes).toHaveBeenCalled();

    // Verify session status updated to completed
    const completedUpdate = updateCalls.find(
      (c) => c.table === "practice_sessions" && c.data.status === "completed"
    );
    expect(completedUpdate).toBeDefined();
  });

  it("updates session to failed when evaluation provider errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockSession = { id: "session-123", status: "analyzing", user_id: "user-1" };
    const mockRecording = { id: "rec-123", duration_seconds: 60, transcription_status: "completed" };
    const mockTranscript = { id: "trans-123", text: "Some response.", segment_timestamps: [] };

    const updateCalls: Array<{ table: string; data: Record<string, unknown> }> = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === "practice_sessions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
              }),
            }),
          }),
          update: (data: Record<string, unknown>) => {
            updateCalls.push({ table, data });
            return {
              eq: () => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          },
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "Software Engineer" } }),
            }),
          }),
        };
      }
      if (table === "recordings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    single: vi.fn().mockResolvedValue({ data: mockRecording, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "transcripts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockTranscript, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "evaluations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockEvaluate.mockRejectedValue(new Error("Gemini quota exhausted"));

    const result = await evaluateSession("session-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gemini quota exhausted");

    const failedUpdate = updateCalls.find(
      (c) => c.table === "practice_sessions" && c.data.status === "failed"
    );
    expect(failedUpdate).toBeDefined();
  });
});
