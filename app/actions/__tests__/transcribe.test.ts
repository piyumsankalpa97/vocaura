import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcribeSession } from "../transcribe";

// Mock supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  })),
}));

// Mock speech provider
const mockTranscribe = vi.fn();
vi.mock("@/lib/providers/groq-speech", () => ({
  getGroqSpeechProvider: () => ({
    transcribe: mockTranscribe,
  }),
}));

describe("transcribeSession action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no user session is found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await transcribeSession("session-123");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unauthorized");
  });

  it("returns error if practice session is not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq1 = vi.fn().mockReturnThis();
    const mockEq2 = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") });

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq1,
      single: mockSingle,
    });
    mockEq1.mockReturnValue({ eq: mockEq2 });
    mockEq2.mockReturnValue({ single: mockSingle });

    const res = await transcribeSession("session-123");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Practice session not found");
  });

  it("successfully coordinates transcription and persistence", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    // Mock practice_sessions select
    const mockSession = { id: "session-123", status: "uploaded", user_id: "user-1" };
    // Mock recordings select
    const mockRecording = {
      id: "rec-123",
      session_id: "session-123",
      user_id: "user-1",
      storage_path: "user-1/audio.webm",
      transcription_status: "pending",
    };

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "transcript-123",
            text: "Here is the transcription.",
            word_count: 4,
            language: "en",
          },
          error: null,
        }),
      }),
    });

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
          update: mockUpdate,
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
          update: mockUpdate,
        };
      }
      if (table === "transcripts") {
        return {
          upsert: mockUpsert,
        };
      }
      return {};
    });

    // Mock storage download
    mockStorageFrom.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: new Blob(["audio-data"]),
        error: null,
      }),
    });

    // Mock provider
    mockTranscribe.mockResolvedValue({
      text: "Here is the transcription.",
      language: "en",
      wordCount: 4,
      segments: [],
      words: [],
    });

    const result = await transcribeSession("session-123");

    expect(result.success).toBe(true);
    expect(result.transcript?.text).toBe("Here is the transcription.");
    expect(mockTranscribe).toHaveBeenCalled();
  });

  it("marks session and recording as failed when provider throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockSession = { id: "session-123", status: "uploaded", user_id: "user-1" };
    const mockRecording = {
      id: "rec-123",
      session_id: "session-123",
      user_id: "user-1",
      storage_path: "user-1/audio.webm",
      transcription_status: "pending",
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
      return {};
    });

    mockStorageFrom.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: new Blob(["audio-data"]),
        error: null,
      }),
    });

    mockTranscribe.mockRejectedValue(new Error("Groq Whisper API connection timeout"));

    const result = await transcribeSession("session-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Groq Whisper API connection timeout");

    // Verify status was set to failed on failure
    const sessionFailedUpdate = updateCalls.find(
      (call) => call.table === "practice_sessions" && call.data.status === "failed"
    );
    const recordingFailedUpdate = updateCalls.find(
      (call) => call.table === "recordings" && call.data.transcription_status === "failed"
    );

    expect(sessionFailedUpdate).toBeDefined();
    expect(recordingFailedUpdate).toBeDefined();
  });
});
