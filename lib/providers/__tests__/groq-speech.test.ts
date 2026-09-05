import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroqSpeechProvider } from "../groq-speech";

// Mock groq-sdk
vi.mock("groq-sdk", () => {
  return {
    default: class MockGroq {
      audio = {
        transcriptions: {
          create: vi.fn(),
        },
      };
    },
    toFile: vi.fn(async (_file: unknown, name: string) => ({ name, size: 100 })),
  };
});

interface MockClientProvider {
  client: {
    audio: {
      transcriptions: {
        create: ReturnType<typeof vi.fn>;
      };
    };
  };
}

describe("GroqSpeechProvider", () => {
  let provider: GroqSpeechProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GroqSpeechProvider("test-groq-key");
  });

  it("successfully transforms Groq verbose_json response", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      text: "Hello world this is a test.",
      language: "en",
      segments: [
        {
          id: 0,
          start: 0.0,
          end: 2.5,
          text: "Hello world",
          tokens: [1, 2],
          temperature: 0,
          avg_logprob: -0.2,
          compression_ratio: 1.1,
          no_speech_prob: 0.01,
        },
        {
          id: 1,
          start: 2.5,
          end: 4.0,
          text: "this is a test.",
          tokens: [3, 4, 5],
          temperature: 0,
          avg_logprob: -0.1,
          compression_ratio: 1.0,
          no_speech_prob: 0.02,
        },
      ],
      words: [
        { word: "Hello", start: 0.0, end: 0.5 },
        { word: "world", start: 0.5, end: 1.0 },
      ],
    });

    (provider as unknown as MockClientProvider).client.audio.transcriptions.create = mockCreate;

    const fakeBlob = new Blob(["fake-audio-content"], { type: "audio/webm" });
    const result = await provider.transcribe({
      file: fakeBlob,
      fileName: "test.webm",
      language: "en",
    });

    expect(result.text).toBe("Hello world this is a test.");
    expect(result.language).toBe("en");
    expect(result.wordCount).toBe(2); // From words array
    expect(result.segments?.length).toBe(2);
    expect(result.segments?.[0].text).toBe("Hello world");
    expect(result.segments?.[1].end).toBe(4.0);
  });

  it("calculates fallback word count deterministically when words array is absent", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      text: "The patient is experiencing mild shortness of breath.",
      language: "en",
      segments: [],
    });

    (provider as unknown as MockClientProvider).client.audio.transcriptions.create = mockCreate;

    const fakeBlob = new Blob(["fake-audio-content"], { type: "audio/webm" });
    const result = await provider.transcribe({
      file: fakeBlob,
      fileName: "nursing-response.webm",
    });

    expect(result.text).toBe("The patient is experiencing mild shortness of breath.");
    expect(result.wordCount).toBe(8); // 8 words split by whitespace
  });

  it("propagates error when Groq transcription call fails", async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error("Groq API rate limit exceeded"));
    (provider as unknown as MockClientProvider).client.audio.transcriptions.create = mockCreate;

    const fakeBlob = new Blob(["fake-audio-content"], { type: "audio/webm" });

    await expect(
      provider.transcribe({
        file: fakeBlob,
        fileName: "test.webm",
      })
    ).rejects.toThrow("Groq API rate limit exceeded");
  });
});
