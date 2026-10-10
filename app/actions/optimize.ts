"use server";

import { createClient } from "@/lib/supabase/server";
import { getGeminiOptimizationProvider } from "@/lib/providers/gemini-optimization";
import {
  filterApplicableCorrections,
  TranscriptCorrection,
} from "@/lib/ai/optimization-schema";
import { logger } from "@/lib/logger";

export interface OptimizeSessionResult {
  success: boolean;
  originalText?: string;
  corrections?: TranscriptCorrection[];
  error?: string;
}

export async function optimizeSessionTranscript(
  sessionId: string
): Promise<OptimizeSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized: User not authenticated." };
  }

  // 1. Fetch practice session
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .select("id, status, user_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Practice session not found." };
  }

  // Never rewind a session that already has an evaluation
  const { data: existingEvaluation } = await supabase
    .from("evaluations")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingEvaluation) {
    return { success: false, error: "This session has already been evaluated." };
  }

  // 2. Fetch latest recording
  const { data: recording, error: recordingError } = await supabase
    .from("recordings")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recordingError || !recording) {
    return { success: false, error: "No recording found for this session." };
  }

  // 3. Fetch transcript
  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .select("id, text, original_text, optimization_changes")
    .eq("recording_id", recording.id)
    .eq("user_id", user.id)
    .single();

  if (transcriptError || !transcript || !transcript.text) {
    return { success: false, error: "Transcript not found." };
  }

  const rawText = transcript.original_text || transcript.text;

  // 4. Fetch user's registered personal vocabulary
  const { data: vocabRows } = await supabase
    .from("user_vocabulary")
    .select("entity, category")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const vocabulary = (vocabRows || []).map((row) => ({
    entity: row.entity,
    category: row.category,
  }));

  try {
    // 5. Update session status to optimizing
    await supabase
      .from("practice_sessions")
      .update({ status: "optimizing" })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    // 6. Call Gemini Optimization Provider
    const provider = getGeminiOptimizationProvider();
    const { result } = await provider.optimize(rawText, vocabulary);

    // Drop anything that doesn't match a phrase actually present in the transcript
    const corrections = filterApplicableCorrections(rawText, result.corrections || []);

    // 7. Store original_text and optimization_changes
    const { error: saveError } = await supabase
      .from("transcripts")
      .update({
        original_text: rawText,
        optimization_changes: corrections,
      })
      .eq("id", transcript.id)
      .eq("user_id", user.id);
    if (saveError) {
      throw new Error(`Failed to save vocabulary suggestions: ${saveError.message}`);
    }

    // 8. Update session status to reviewing
    await supabase
      .from("practice_sessions")
      .update({ status: "reviewing" })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    return {
      success: true,
      originalText: rawText,
      corrections,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to optimize transcript with AI.";
    logger.error({ err, sessionId }, "Transcript optimization failed");

    // Roll back so a reload retries the vocabulary check instead of getting stuck
    await supabase
      .from("practice_sessions")
      .update({ status: "transcribed" })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    return {
      success: false,
      originalText: rawText,
      error: `Vocabulary check failed: ${errorMsg}`,
    };
  }
}
