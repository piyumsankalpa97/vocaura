import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findMatchingCorrection,
  fetchKnownMistakeKeys,
  syncEvaluationMistakes,
} from "../mistakes";
import { CorrectionItem, RecurringMistakeItem } from "../evaluation-schema";
import { SupabaseClient } from "@supabase/supabase-js";

describe("Mistake Intelligence Logic", () => {
  describe("findMatchingCorrection", () => {
    const corrections: CorrectionItem[] = [
      {
        heard: "I have worked in this project",
        better: "I have worked on this project",
        why: "Use 'work on' for projects.",
      },
      {
        heard: "actually basically we did it",
        better: "we completed the task",
        why: "Remove double fillers.",
      },
    ];

    it("matches identical phrases case-insensitively", () => {
      const match = findMatchingCorrection("i have worked in this project", corrections);
      expect(match).toBeDefined();
      expect(match?.better).toBe("I have worked on this project");
    });

    it("matches by substring containment in either direction", () => {
      const match1 = findMatchingCorrection("worked in this project", corrections);
      expect(match1).toBeDefined();
      expect(match1?.better).toBe("I have worked on this project");

      const match2 = findMatchingCorrection("actually basically", corrections);
      expect(match2).toBeDefined();
      expect(match2?.better).toBe("we completed the task");
    });

    it("returns undefined when no match exists", () => {
      const match = findMatchingCorrection("completely unrelated sentence", corrections);
      expect(match).toBeUndefined();
    });

    it("handles empty and edge inputs safely", () => {
      expect(findMatchingCorrection("", corrections)).toBeUndefined();
      expect(findMatchingCorrection("test", [])).toBeUndefined();
    });
  });

  describe("fetchKnownMistakeKeys", () => {
    it("returns keys of unresolved mistakes", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              { canonical_key: "prep_work_on" },
              { canonical_key: "filler_basically" },
            ],
            error: null,
          }),
        })),
      } as unknown as SupabaseClient;

      const keys = await fetchKnownMistakeKeys(mockSupabase, "user-123", 5);
      expect(keys).toEqual(["prep_work_on", "filler_basically"]);
    });

    it("returns empty array when error occurs", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: new Error("DB Error"),
          }),
        })),
      } as unknown as SupabaseClient;

      const keys = await fetchKnownMistakeKeys(mockSupabase, "user-123");
      expect(keys).toEqual([]);
    });
  });

  describe("syncEvaluationMistakes", () => {
    const recurringMistakes: RecurringMistakeItem[] = [
      {
        canonical_key: "prep_work_on",
        type: "preposition",
        severity: "medium",
        example: "worked in this project",
      },
    ];

    const corrections: CorrectionItem[] = [
      {
        heard: "worked in this project",
        better: "worked on this project",
        why: "Use 'work on' for projects.",
      },
    ];

    it("inserts a new mistake when no previous occurrence exists", async () => {
      const insertMistakeMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "mistake-1" },
            error: null,
          }),
        }),
      });

      const upsertLinkMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "mistakes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No existing
              insert: insertMistakeMock,
            };
          }
          if (table === "evaluation_mistakes") {
            return {
              upsert: upsertLinkMock,
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      await syncEvaluationMistakes(mockSupabase, {
        userId: "user-1",
        evaluationId: "eval-1",
        recurringMistakes,
        corrections,
      });

      expect(insertMistakeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          canonical_key: "prep_work_on",
          occurrence_count: 1,
          resolved: false,
          corrected_example: "worked on this project",
          explanation: "Use 'work on' for projects.",
        })
      );

      expect(upsertLinkMock).toHaveBeenCalledWith(
        {
          evaluation_id: "eval-1",
          mistake_id: "mistake-1",
          example_in_session: "worked in this project",
        },
        { onConflict: "evaluation_id,mistake_id" }
      );
    });

    it("increments occurrence_count when mistake already exists", async () => {
      const existingMistake = {
        id: "existing-mistake-1",
        occurrence_count: 3,
        incorrect_example: "old example",
        corrected_example: "old correction",
        explanation: "old explanation",
        severity: "medium",
      };

      const updateMistakeMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "existing-mistake-1" },
              error: null,
            }),
          }),
        }),
      });

      const upsertLinkMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "mistakes") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: existingMistake }),
              update: updateMistakeMock,
            };
          }
          if (table === "evaluation_mistakes") {
            return {
              upsert: upsertLinkMock,
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      await syncEvaluationMistakes(mockSupabase, {
        userId: "user-1",
        evaluationId: "eval-2",
        recurringMistakes,
        corrections,
      });

      expect(updateMistakeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          occurrence_count: 4, // 3 + 1
          resolved: false,
          corrected_example: "worked on this project",
        })
      );

      expect(upsertLinkMock).toHaveBeenCalledWith(
        {
          evaluation_id: "eval-2",
          mistake_id: "existing-mistake-1",
          example_in_session: "worked in this project",
        },
        { onConflict: "evaluation_id,mistake_id" }
      );
    });
  });
});
