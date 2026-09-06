import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWeeklySummary } from '../weekly-summary';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn((model: string) => model)),
}));

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getServerEnv: vi.fn(() => ({
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-test-model'
  }))
}));

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';

describe('generateWeeklySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a weekly summary correctly using mock data and Gemini mock', async () => {
    // 1. Mock Supabase Client responses
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockReturnThis();
    const mockLt = vi.fn().mockReturnThis();
    const mockUpsert = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'summary-1',
        session_count: 2,
        speaking_minutes: 2.5,
        average_score: 75.0,
        previous_average_score: 70.0,
        score_delta: 5.0,
        summary_json: {
          title: "Great Week!",
          overview: "You did well.",
          strengths: ["Fluency"],
          focus_areas: ["Grammar"],
          encouragement: "Keep it up!"
        }
      },
      error: null
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'practice_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: mockEq,
            gte: mockGte,
            lt: vi.fn().mockImplementation((col: string, val: string) => {
              // Return mock data for the current week vs previous week
              // For simplicity, we just return the same mock data or handle it based on how many times it was called
              if (mockEq.mock.calls.length === 1) { // Current week
                return {
                  data: [
                    {
                      id: 'session-1',
                      recordings: [{ duration_seconds: 90 }],
                      evaluations: [{ overall_score: 80, analysis_json: { recurring_mistakes: [{ type: 'grammar' }] } }]
                    },
                    {
                      id: 'session-2',
                      recordings: [{ duration_seconds: 60 }],
                      evaluations: [{ overall_score: 70 }]
                    }
                  ]
                };
              } else { // Previous week
                return {
                  data: [
                    {
                      id: 'session-0',
                      evaluations: [{ overall_score: 70 }]
                    }
                  ]
                };
              }
            })
          };
        }
        if (table === 'weekly_summaries') {
          return {
            upsert: mockUpsert,
            select: vi.fn().mockReturnThis(),
            single: mockSingle,
          };
        }
      })
    };

    (createClient as any).mockResolvedValue(mockSupabase);

    // 2. Mock Gemini generateObject response
    (generateObject as any).mockResolvedValue({
      object: {
        title: "Great Week!",
        overview: "You did well.",
        strengths: ["Fluency"],
        focus_areas: ["Grammar"],
        encouragement: "Keep it up!"
      }
    });

    // 3. Execute
    const userId = 'user-123';
    const targetDate = new Date('2023-10-15T00:00:00Z');
    
    const result = await generateWeeklySummary(mockSupabase, userId, targetDate);

    // 4. Verify AI invocation
    expect(generateObject).toHaveBeenCalledTimes(1);
    const aiCallArgs = (generateObject as any).mock.calls[0][0];
    
    // Check if the prompt got the correct aggregated numbers
    expect(aiCallArgs.prompt).toContain('Sessions completed: 2');
    expect(aiCallArgs.prompt).toContain('Speaking minutes: 2.5'); // (90 + 60) / 60
    expect(aiCallArgs.prompt).toContain('Average Score: 75.0'); // (80 + 70) / 2
    expect(aiCallArgs.prompt).toContain('Score Change from Last Week: +5.0'); // 75 - 70

    // 5. Verify database upsert
    expect(mockSupabase.from).toHaveBeenCalledWith('weekly_summaries');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        session_count: 2,
        speaking_minutes: 2.5,
        average_score: 75,
        previous_average_score: 70,
        score_delta: 5,
        summary_json: expect.objectContaining({ title: 'Great Week!' })
      }),
      { onConflict: 'user_id, period_start, period_end' }
    );

    // 6. Verify result
    expect(result.average_score).toBe(75.0);
    expect(result.summary_json.title).toBe('Great Week!');
  });
});
