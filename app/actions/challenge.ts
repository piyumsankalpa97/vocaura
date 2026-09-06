"use server";

import { createClient } from "@/lib/supabase/server";
import { getGeminiEvaluationProvider } from "@/lib/providers/gemini-evaluation";
import { DailyChallenge } from "@/lib/ai/challenge-schema";
import { logger } from "@/lib/logger";

export interface TodayChallengeResult {
  hasChallenge: boolean;
  sessionId?: string;
  prompt?: {
    id: string;
    title: string;
    prompt: string;
    context: string | null;
    expected_skills: string[];
    estimated_minutes: number;
  };
  sessionStatus?: string;
}

export async function getTodayDailyChallenge(): Promise<TodayChallengeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hasChallenge: false };
  }

  // Today start in ISO string
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: session } = await supabase
    .from("practice_sessions")
    .select("id, status, practice_prompts(id, title, prompt, context, expected_skills, estimated_minutes)")
    .eq("user_id", user.id)
    .eq("mode", "challenge")
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session || !session.practice_prompts) {
    return { hasChallenge: false };
  }

  const prompt = Array.isArray(session.practice_prompts)
    ? session.practice_prompts[0]
    : session.practice_prompts;

  return {
    hasChallenge: true,
    sessionId: session.id,
    sessionStatus: session.status,
    prompt: prompt as unknown as TodayChallengeResult["prompt"],
  };
}

export interface GenerateChallengeResponse {
  success: boolean;
  sessionId?: string;
  promptId?: string;
  error?: string;
}

export async function generateDailyChallengeAction(): Promise<GenerateChallengeResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized: User not authenticated." };
  }

  // 1. Check if user already generated a challenge today
  const existing = await getTodayDailyChallenge();
  if (existing.hasChallenge && existing.sessionId && existing.prompt?.id) {
    return {
      success: true,
      sessionId: existing.sessionId,
      promptId: existing.prompt.id,
    };
  }

  try {
    // 2. Fetch profile (role, context, goals)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, professional_context, goals")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role || "Software Engineer";
    const userContext = profile?.professional_context || "Professional workplace communication";
    const userGoals = profile?.goals || [];

    // 3. Fetch top 3 unresolved mistakes ordered by occurrence_count DESC
    const { data: mistakes } = await supabase
      .from("mistakes")
      .select("canonical_key, type, occurrence_count")
      .eq("user_id", user.id)
      .eq("resolved", false)
      .order("occurrence_count", { ascending: false })
      .limit(3);

    const weaknesses =
      mistakes && mistakes.length > 0
        ? mistakes.map(
            (m) => `${m.canonical_key} (${m.type}, seen ${m.occurrence_count} times)`
          )
        : ["Hesitation and pause control", "Concise technical summaries"];

    // 4. Fetch recent category names
    const { data: recentSessions } = await supabase
      .from("practice_sessions")
      .select("practice_categories(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentCategories = (recentSessions || [])
      .map((s) => {
        const cat = s.practice_categories;
        if (Array.isArray(cat)) {
          return cat[0]?.name as string | undefined;
        }
        return (cat as { name?: string } | null)?.name;
      })
      .filter((name): name is string => Boolean(name));

    // 5. Generate with Gemini (with deterministic fallback per AGENTS.md rule)
    let challengeData: DailyChallenge;

    try {
      const provider = getGeminiEvaluationProvider();
      if (!provider.generateChallenge) {
        throw new Error("Provider does not support challenge generation.");
      }

      const response = await provider.generateChallenge({
        role: userRole,
        professional_context: userContext,
        goals: userGoals,
        weaknesses: weaknesses,
        recent_categories: recentCategories,
      });

      challengeData = response.challenge;
    } catch (llmErr) {
      logger.warn({ err: llmErr }, "LLM challenge generation failed, using deterministic fallback");
      
      const primaryWeakness = mistakes?.[0]?.canonical_key || "concise professional communication";
      challengeData = {
        title: `Daily Challenge: Targeting ${primaryWeakness.replace(/_/g, " ")}`,
        reason: `Generated from your recent training patterns targeting recurring weakness: ${primaryWeakness}.`,
        prompt: `Explain a recent project decision or patient update to a colleague, paying strict attention to phrasing and eliminating "${primaryWeakness}". Speak clearly for 60 to 90 seconds.`,
        expected_skill: primaryWeakness,
        estimated_minutes: 5,
      };
    }

    // 6. Insert new prompt into practice_prompts with user_id for clean isolation
    const { data: newPrompt, error: promptError } = await supabase
      .from("practice_prompts")
      .insert({
        user_id: user.id,
        role_scope: [userRole],
        difficulty: 2,
        title: challengeData.title,
        prompt: challengeData.prompt,
        context: challengeData.reason,
        expected_skills: [challengeData.expected_skill],
        estimated_minutes: challengeData.estimated_minutes,
        active: false, // keeps it as an isolated user challenge rather than standard catalog
      })
      .select("id")
      .single();

    if (promptError || !newPrompt) {
      throw new Error(`Failed to save daily challenge prompt: ${promptError?.message || "DB error"}`);
    }

    // 7. Create practice_sessions entry
    const { data: session, error: sessionError } = await supabase
      .from("practice_sessions")
      .insert({
        user_id: user.id,
        prompt_id: newPrompt.id,
        category_id: null,
        mode: "challenge",
        status: "created",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      throw new Error(`Failed to create challenge session: ${sessionError?.message || "DB error"}`);
    }

    return {
      success: true,
      sessionId: session.id,
      promptId: newPrompt.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate daily challenge.";
    logger.error({ err }, "generateDailyChallengeAction error");
    return {
      success: false,
      error: message,
    };
  }
}
