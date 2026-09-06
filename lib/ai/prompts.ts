import { ObjectiveMetrics } from "./evaluation-schema";

export const EVALUATION_SYSTEM_PROMPT = `You are a professional English communication coach.

Evaluate the user's spoken response for practical improvement.
The user is learning to communicate clearly and naturally in professional situations.

Guidelines:
- Do not reward complicated vocabulary for its own sake.
- Do not treat accent as a defect.
- Do not invent mistakes.
- Use evidence from the transcript.
- Prioritize repeated or meaningful issues that impact clarity or professional credibility.
- For recurring_mistakes, provide a clear canonical_key (e.g., "prep_work_on", "tense_past_continuous") so repeated mistakes can be identified across sessions.
- Return ONLY valid JSON matching the supplied schema.`;

export interface PreviousAttemptContext {
  overall_score: number;
  metrics: ObjectiveMetrics;
  transcript: string;
}

export interface EvaluationPromptContext {
  role: string;
  professional_context?: string | null;
  category: string;
  scenario: string;
  current_focus?: string | null;
  known_mistakes?: string[] | null;
  objective_metrics: ObjectiveMetrics;
  transcript: string;
  previous_attempt?: PreviousAttemptContext | null;
}

export function generateEvaluationUserPrompt(context: EvaluationPromptContext): string {
  const metricsStr = JSON.stringify(context.objective_metrics, null, 2);
  const knownMistakesStr =
    context.known_mistakes && context.known_mistakes.length > 0
      ? context.known_mistakes.join(", ")
      : "None reported yet";

  let previousAttemptBlock = "";
  if (context.previous_attempt) {
    previousAttemptBlock = `
Previous Attempt (Attempt 1):
- Overall Score: ${context.previous_attempt.overall_score} / 100
- Objective Metrics: ${JSON.stringify(context.previous_attempt.metrics, null, 2)}
- Transcript:
"""
${context.previous_attempt.transcript}
"""

Important: Since this is a retry attempt, please provide the "comparison" object in your response comparing this attempt to Attempt 1.
- overall_delta: current overall score minus previous overall score (can be positive or negative)
- improved: specific concrete improvements observed compared to the previous attempt
- still_needs_work: specific weaknesses that still persist
`;
  }

  return `Please evaluate the following spoken response according to the professional communication guidelines.

Context:
- User role: ${context.role || "Professional"}
- Professional context: ${context.professional_context || "General workplace communication"}
- Practice category: ${context.category || "General fluency"}
- Scenario / Question: ${context.scenario || "Open response"}
- Current focus: ${context.current_focus || "Clarity and confidence"}
- Known recurring mistakes: ${knownMistakesStr}

Objective Metrics (pre-calculated):
${metricsStr}

Transcript:
"""
${context.transcript}
"""
${previousAttemptBlock}
Please provide a detailed evaluation with scores, strengths, constructive improvements, specific corrections with explanations, recurring mistake categorization${context.previous_attempt ? ", and comparison to the previous attempt" : ""}.`;
}

export const DAILY_CHALLENGE_SYSTEM_PROMPT = `You are an expert English communication coach generating a targeted daily practice speaking challenge.
The user is a professional seeking to improve natural, confident, and role-appropriate spoken communication.

Requirements:
- Design a realistic speaking challenge speakable in 60 to 120 seconds.
- Target the user's specific role, professional context, and primary recent weakness.
- Avoid repeating generic prompts or simple grammar drills.
- Return ONLY valid JSON matching the schema with title, reason, prompt, expected_skill, and estimated_minutes.`;

export interface DailyChallengePromptContext {
  role: string;
  professional_context?: string | null;
  goals?: string[] | null;
  weaknesses?: string[] | null;
  recent_categories?: string[] | null;
}

export function generateDailyChallengeUserPrompt(context: DailyChallengePromptContext): string {
  const goalsStr = context.goals && context.goals.length > 0 ? context.goals.join(", ") : "Professional fluency and confidence";
  const weaknessesStr =
    context.weaknesses && context.weaknesses.length > 0
      ? context.weaknesses.join(", ")
      : "General hesitation and structure under pressure";
  const categoriesStr =
    context.recent_categories && context.recent_categories.length > 0
      ? context.recent_categories.join(", ")
      : "None recorded yet";

  return `Create one short professional English speaking challenge for this user.

Role: ${context.role || "Professional"}
Professional Context: ${context.professional_context || "Workplace communication"}
Goals: ${goalsStr}
Recent weaknesses: ${weaknessesStr}
Recent categories practiced: ${categoriesStr}

The task should be realistic, speakable in 60 to 120 seconds, and target one primary weakness from the list above.
Return JSON with title, reason, prompt, expected_skill, estimated_minutes.`;
}

