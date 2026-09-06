import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { generateObject } from "ai";
import { getServerEnv } from "@/lib/env";
import {
  EvaluationResult,
  evaluationResultSchema,
  calculateWeightedOverallScore,
} from "@/lib/ai/evaluation-schema";
import {
  EVALUATION_SYSTEM_PROMPT,
  generateEvaluationUserPrompt,
} from "@/lib/ai/prompts";
import {
  LanguageEvaluationInput,
  LanguageEvaluationProvider,
  EvaluationProviderResponse,
} from "./language-evaluation";

export class GeminiEvaluationProvider implements LanguageEvaluationProvider {
  private google: GoogleGenerativeAIProvider;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || getServerEnv().GEMINI_API_KEY;
    this.google = createGoogleGenerativeAI({
      apiKey: key,
    });
    this.model = model || getServerEnv().GEMINI_MODEL || "gemini-3.6-flash";
  }

  async evaluate(input: LanguageEvaluationInput): Promise<EvaluationProviderResponse> {
    const selectedModel = input.model || this.model;
    const userPrompt = generateEvaluationUserPrompt(input);

    const { object: rawEvaluation, usage } = await generateObject({
      model: this.google(selectedModel),
      system: EVALUATION_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: evaluationResultSchema,
    });

    // Enforce deterministic objective metrics calculated in TypeScript
    const validatedMetrics = {
      ...rawEvaluation.objective_metrics,
      word_count: input.objective_metrics.word_count,
      duration_seconds: input.objective_metrics.duration_seconds,
      wpm: input.objective_metrics.wpm,
      filler_count: input.objective_metrics.filler_count,
      long_pause_count: input.objective_metrics.long_pause_count ?? 0,
    };

    // Calculate deterministic overall score based on the category weightings in 05_AI_EVALUATION.md
    const deterministicOverallScore = calculateWeightedOverallScore(rawEvaluation.scores);

    const finalEvaluation: EvaluationResult = evaluationResultSchema.parse({
      ...rawEvaluation,
      overall_score: deterministicOverallScore,
      objective_metrics: validatedMetrics,
    });

    return {
      evaluation: finalEvaluation,
      modelProvider: "google",
      modelName: selectedModel,
      rawUsage: usage
        ? {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
          }
        : undefined,
    };
  }

  async generateChallenge(input: import("./language-evaluation").DailyChallengeInput): Promise<import("./language-evaluation").DailyChallengeProviderResponse> {
    const selectedModel = input.model || this.model;
    const { DAILY_CHALLENGE_SYSTEM_PROMPT, generateDailyChallengeUserPrompt } = await import("@/lib/ai/prompts");
    const { dailyChallengeSchema } = await import("@/lib/ai/challenge-schema");
    const userPrompt = generateDailyChallengeUserPrompt(input);

    const { object: rawChallenge } = await generateObject({
      model: this.google(selectedModel),
      system: DAILY_CHALLENGE_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: dailyChallengeSchema,
    });

    const challenge = dailyChallengeSchema.parse(rawChallenge);

    return {
      challenge,
      modelProvider: "google",
      modelName: selectedModel,
    };
  }
}

let defaultGeminiProvider: GeminiEvaluationProvider | null = null;

export function getGeminiEvaluationProvider(): GeminiEvaluationProvider {
  if (!defaultGeminiProvider) {
    defaultGeminiProvider = new GeminiEvaluationProvider();
  }
  return defaultGeminiProvider;
}
