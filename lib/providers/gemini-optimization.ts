import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { generateObject } from "ai";
import { getServerEnv } from "@/lib/env";
import {
  transcriptOptimizationResultSchema,
  TranscriptOptimizationResult,
} from "@/lib/ai/optimization-schema";
import {
  TRANSCRIPT_OPTIMIZATION_SYSTEM_PROMPT,
  generateTranscriptOptimizationPrompt,
  VocabularyItem,
} from "@/lib/ai/prompts";

export interface OptimizationProviderResponse {
  result: TranscriptOptimizationResult;
  modelProvider: string;
  modelName: string;
}

export class GeminiOptimizationProvider {
  private google: GoogleGenerativeAIProvider;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || getServerEnv().GEMINI_API_KEY;
    this.google = createGoogleGenerativeAI({
      apiKey: key,
    });
    this.model = model || getServerEnv().GEMINI_MODEL || "gemini-3.6-flash";
  }

  async optimize(
    rawTranscript: string,
    vocabulary: VocabularyItem[]
  ): Promise<OptimizationProviderResponse> {
    if (!rawTranscript || rawTranscript.trim() === "") {
      return {
        result: { corrections: [] },
        modelProvider: "google",
        modelName: this.model,
      };
    }

    const userPrompt = generateTranscriptOptimizationPrompt(rawTranscript, vocabulary);

    const { object } = await generateObject({
      model: this.google(this.model),
      system: TRANSCRIPT_OPTIMIZATION_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: transcriptOptimizationResultSchema,
    });

    const parsed = transcriptOptimizationResultSchema.parse(object);

    return {
      result: parsed,
      modelProvider: "google",
      modelName: this.model,
    };
  }
}

let defaultGeminiOptimizationProvider: GeminiOptimizationProvider | null = null;

export function getGeminiOptimizationProvider(): GeminiOptimizationProvider {
  if (!defaultGeminiOptimizationProvider) {
    defaultGeminiOptimizationProvider = new GeminiOptimizationProvider();
  }
  return defaultGeminiOptimizationProvider;
}
