import { describe, it, expect, vi, beforeEach } from "vitest";
import { deletePracticeSession, purgeUserAudio } from "../recording";

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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("deletePracticeSession action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when user is not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await deletePracticeSession(VALID_UUID);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unauthorized");
  });

  it("successfully deletes recordings from storage and session from DB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null });
    mockStorageFrom.mockReturnValue({ remove: mockRemove });

    // Mock recordings query
    const mockSelectRecordings = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ storage_path: "user-1/rec-1.webm" }],
          error: null,
        }),
      }),
    });

    // Mock session delete query
    const mockDeleteSession = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "recordings") {
        return { select: mockSelectRecordings };
      }
      if (table === "practice_sessions") {
        return { delete: mockDeleteSession };
      }
      return {};
    });

    const res = await deletePracticeSession(VALID_UUID);
    expect(res.success).toBe(true);
    expect(mockRemove).toHaveBeenCalledWith(["user-1/rec-1.webm"]);
  });
});

describe("purgeUserAudio action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when user is not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await purgeUserAudio();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unauthorized");
  });

  it("deletes audio files and clears storage_path from recordings table", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null });
    mockStorageFrom.mockReturnValue({ remove: mockRemove });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue({
          data: [
            { id: "rec-1", storage_path: "user-1/audio1.webm" },
            { id: "rec-2", storage_path: "user-1/audio2.webm" },
          ],
          error: null,
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "recordings") {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    });

    const res = await purgeUserAudio();
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
    expect(mockRemove).toHaveBeenCalledWith(["user-1/audio1.webm", "user-1/audio2.webm"]);
  });
});
