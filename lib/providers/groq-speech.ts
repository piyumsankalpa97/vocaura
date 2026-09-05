import Groq, { toFile } from "groq-sdk";
import { getServerEnv } from "@/lib/env";
import {
  SpeechToTextProvider,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptSegment,
  TranscriptWord,
} from "./speech-to-text";

export class GroqSpeechProvider implements SpeechToTextProvider {
  private client: Groq;
  private model: string;

  constructor(apiKey?: string, model: string = "whisper-large-v3-turbo") {
    const key = apiKey || getServerEnv().GROQ_API_KEY;
    this.client = new Groq({ apiKey: key });
    this.model = model;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const fileName = input.fileName || "audio.webm";
    const uploadableFile = await toFile(input.file, fileName);

    const response = (await this.client.audio.transcriptions.create({
      file: uploadableFile,
      model: this.model,
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"],
      language: (input.language as "en" | undefined) || "en",
      prompt: input.prompt,
      temperature: 0,
    })) as unknown as {
      text?: string;
      language?: string;
      duration?: number;
      segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
        tokens?: number[];
        temperature?: number;
        avg_logprob?: number;
        compression_ratio?: number;
        no_speech_prob?: number;
      }>;
      words?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    };

    const text = response.text || "";
    // Deterministic word count
    const wordsFromText = text.trim() ? text.trim().split(/\s+/).length : 0;
    const wordCount = response.words?.length || wordsFromText;

    const segments: TranscriptSegment[] = (response.segments || []).map((seg) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text,
      tokens: seg.tokens,
      temperature: seg.temperature,
      avg_logprob: seg.avg_logprob,
      compression_ratio: seg.compression_ratio,
      no_speech_prob: seg.no_speech_prob,
    }));

    const words: TranscriptWord[] = (response.words || []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    return {
      text,
      language: response.language || input.language || "en",
      wordCount,
      segments,
      words,
    };
  }
}

let defaultProvider: GroqSpeechProvider | null = null;

export function getGroqSpeechProvider(): GroqSpeechProvider {
  if (!defaultProvider) {
    defaultProvider = new GroqSpeechProvider();
  }
  return defaultProvider;
}
