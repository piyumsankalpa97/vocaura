import { z } from "zod";

export const scoreSchema = z.number().min(0).max(100);

export const evaluationScoresSchema = z.object({
  fluency: scoreSchema.describe("Continuity, ease of expression, and hesitation control"),
  grammar: scoreSchema.describe("Grammatical correctness and naturalness"),
  vocabulary: scoreSchema.describe("Precision, range, and natural professional wording"),
  clarity: scoreSchema.describe("Understandability, sentence structure, and coherence"),
  professionalism: scoreSchema.describe("Tone, directness, politeness, and workplace suitability"),
  structure: scoreSchema.describe("Logical progression, organization, and STAR method usage if applicable"),
  filler_control: scoreSchema.describe("Minimizing distracting filler words and crutch phrases"),
});

export const objectiveMetricsSchema = z.object({
  word_count: z.number().int().nonnegative(),
  duration_seconds: z.number().nonnegative(),
  wpm: z.number().nonnegative(),
  filler_count: z.number().int().nonnegative(),
  long_pause_count: z.number().int().nonnegative().optional().default(0),
});

export const improvementItemSchema = z.object({
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  issue: z.string().min(1, "Issue description is required"),
  evidence: z.string().min(1, "Evidence from transcript is required"),
  recommendation: z.string().min(1, "Actionable recommendation is required"),
});

export const correctionItemSchema = z.object({
  heard: z.string().min(1, "Heard phrase from transcript is required"),
  better: z.string().min(1, "Better alternative is required"),
  why: z.string().min(1, "Explanation of correction is required"),
});

export const recurringMistakeItemSchema = z.object({
  canonical_key: z.string().min(1, "Canonical key is required (e.g. preposition_work_on)"),
  type: z.string().min(1, "Mistake type (e.g. grammar, vocabulary, preposition)"),
  severity: z.enum(["high", "medium", "low"]).default("medium"),
  example: z.string().min(1, "Example quote from response"),
});

export const retryTaskSchema = z.object({
  instruction: z.string().min(1),
  focus: z.string().min(1),
});

export const comparisonSchema = z.object({
  overall_delta: z.number().describe("Difference in overall score compared to previous attempt (positive for improvement, negative for decline)"),
  improved: z.array(z.string().min(1)).describe("Specific aspects that improved compared to the previous attempt"),
  still_needs_work: z.array(z.string().min(1)).describe("Specific aspects that still require practice"),
});

export const evaluationResultSchema = z.object({
  overall_score: scoreSchema,
  summary: z.string().describe("A concise 1-2 sentence overall summary of the response"),
  scores: evaluationScoresSchema,
  objective_metrics: objectiveMetricsSchema,
  strengths: z.array(z.string().min(1)).min(1, "Provide at least one strength"),
  improvements: z.array(improvementItemSchema),
  corrections: z.array(correctionItemSchema),
  recurring_mistakes: z.array(recurringMistakeItemSchema),
  retry_task: retryTaskSchema.optional(),
  comparison: comparisonSchema.optional(),
  pronunciation_note: z
    .string()
    .optional()
    .default(
      "Pronunciation was not scored in this session. The current analysis focuses on language and communication."
    ),
});

export type EvaluationScores = z.infer<typeof evaluationScoresSchema>;
export type ObjectiveMetrics = z.infer<typeof objectiveMetricsSchema>;
export type ImprovementItem = z.infer<typeof improvementItemSchema>;
export type CorrectionItem = z.infer<typeof correctionItemSchema>;
export type RecurringMistakeItem = z.infer<typeof recurringMistakeItemSchema>;
export type RetryTask = z.infer<typeof retryTaskSchema>;
export type ComparisonResult = z.infer<typeof comparisonSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

/**
 * Calculates deterministic overall score according to 05_AI_EVALUATION.md weights:
 * Fluency: 20%
 * Grammar: 15%
 * Vocabulary: 10%
 * Clarity: 20%
 * Professionalism: 15%
 * Structure: 10%
 * Filler control: 10%
 */
export function calculateWeightedOverallScore(scores: EvaluationScores): number {
  const weighted =
    scores.fluency * 0.2 +
    scores.grammar * 0.15 +
    scores.vocabulary * 0.1 +
    scores.clarity * 0.2 +
    scores.professionalism * 0.15 +
    scores.structure * 0.1 +
    scores.filler_control * 0.1;

  return Math.round(Math.min(100, Math.max(0, weighted)));
}
