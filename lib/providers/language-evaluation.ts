import { EvaluationResult } from "@/lib/ai/evaluation-schema";
import { EvaluationPromptContext, DailyChallengePromptContext } from "@/lib/ai/prompts";
import { DailyChallenge } from "@/lib/ai/challenge-schema";

export interface LanguageEvaluationInput extends EvaluationPromptContext {
  model?: string;
}

export interface EvaluationProviderResponse {
  evaluation: EvaluationResult;
  modelProvider: string;
  modelName: string;
  rawUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface DailyChallengeInput extends DailyChallengePromptContext {
  model?: string;
}

export interface DailyChallengeProviderResponse {
  challenge: DailyChallenge;
  modelProvider: string;
  modelName: string;
}

export interface LanguageEvaluationProvider {
  evaluate(input: LanguageEvaluationInput): Promise<EvaluationProviderResponse>;
  generateChallenge?(input: DailyChallengeInput): Promise<DailyChallengeProviderResponse>;
}
