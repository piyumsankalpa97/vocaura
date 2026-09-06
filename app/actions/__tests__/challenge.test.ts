import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDailyChallengeAction, getTodayDailyChallenge } from "../challenge";

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

const mockGenerateChallenge = vi.fn();
vi.mock("@/lib/providers/gemini-evaluation", () => ({
  getGeminiEvaluationProvider: () => ({
    generateChallenge: mockGenerateChallenge,
  }),
}));

describe("Daily Challenge Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when user is not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await generateDailyChallengeAction();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unauthorized");
  });

  it("returns existing challenge if one was already created today", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-test" } } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "practice_sessions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: "existing-session",
                          status: "created",
                          practice_prompts: {
                            id: "existing-prompt",
                            title: "Sprint Retrospective",
                          },
                        },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await generateDailyChallengeAction();
    expect(res.success).toBe(true);
    expect(res.sessionId).toBe("existing-session");
    expect(res.promptId).toBe("existing-prompt");
    expect(mockGenerateChallenge).not.toHaveBeenCalled();
  });

  it("generates challenge with role and top weaknesses when none exists today", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-test" } } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "practice_sessions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                    }),
                  }),
                }),
              }),
              order: () => ({
                limit: vi.fn().mockResolvedValue({
                  data: [{ practice_categories: { name: "System Design" } }],
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "new-session-id" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  role: "Software Engineer",
                  professional_context: "Distributed systems",
                  goals: ["Lead tech architecture"],
                },
              }),
            }),
          }),
        };
      }
      if (table === "mistakes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        canonical_key: "prep_work_on",
                        type: "preposition",
                        occurrence_count: 5,
                      },
                    ],
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "practice_prompts") {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "new-prompt-id" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockGenerateChallenge.mockResolvedValue({
      challenge: {
        title: "Technical Clarification Under Uncertainty",
        reason: "Targets prep_work_on and concise explanations.",
        prompt: "Clarify system bottleneck to an executive.",
        expected_skill: "concise explanation",
        estimated_minutes: 5,
      },
      modelProvider: "google",
      modelName: "gemini-3.6-flash",
    });

    const res = await generateDailyChallengeAction();
    expect(res.success).toBe(true);
    expect(res.sessionId).toBe("new-session-id");
    expect(res.promptId).toBe("new-prompt-id");
    expect(mockGenerateChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Software Engineer",
        weaknesses: expect.arrayContaining([expect.stringContaining("prep_work_on")]),
      })
    );
  });
});
