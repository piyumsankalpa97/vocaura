"use server";

import { createClient } from "@/lib/supabase/server";
import { getGeminiEvaluationProvider } from "@/lib/providers/gemini-evaluation";
import { computeObjectiveMetrics, SegmentTimestamp } from "@/lib/ai/metrics";
import { EvaluationResult } from "@/lib/ai/evaluation-schema";
import { fetchKnownMistakeKeys, syncEvaluationMistakes } from "@/lib/ai/mistakes";

export interface EvaluateSessionResult {
  success: boolean;
  evaluation?: {
    id: string;
    session_id: string;
    overall_score: number;
    fluency_score: number | null;
    grammar_score: number | null;
    vocabulary_score: number | null;
    clarity_score: number | null;
    professionalism_score: number | null;
    structure_score: number | null;
    filler_control_score: number | null;
    pace_wpm: number | null;
    analysis_json: EvaluationResult;
    model_provider: string | null;
    model_name: string | null;
    created_at: string;
  };
  error?: string;
}

export async function evaluateSession(
  sessionId: string,
  options?: { force?: boolean }
): Promise<EvaluateSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized: User not authenticated." };
  }

  // 1. Fetch practice session + prompt + category
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .select("*, practice_prompts(*, practice_categories(*))")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Practice session not found." };
  }

  // 2. Fetch user profile for context (role, professional context, goals)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, professional_context, goals")
    .eq("id", user.id)
    .maybeSingle();

  // 3. Fetch latest recording
  const { data: recording, error: recordingError } = await supabase
    .from("recordings")
    .select("id, duration_seconds, transcription_status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recordingError || !recording) {
    return { success: false, error: "No recording found for this session." };
  }

  // 4. Fetch transcript
  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .select("id, text, segment_timestamps")
    .eq("recording_id", recording.id)
    .eq("user_id", user.id)
    .single();

  if (transcriptError || !transcript || !transcript.text) {
    return {
      success: false,
      error: "No transcript available to evaluate. Please transcribe the recording first.",
    };
  }

  // 5. Check if evaluation already exists and not forced
  if (!options?.force) {
    const { data: existingEvaluation } = await supabase
      .from("evaluations")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingEvaluation) {
      return {
        success: true,
        evaluation: existingEvaluation as unknown as EvaluateSessionResult["evaluation"],
      };
    }
  }

  // 6. Update session status to analyzing
  await supabase
    .from("practice_sessions")
    .update({ status: "analyzing" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  try {
    // 7. Calculate deterministic objective metrics in TypeScript
    const segments = transcript.segment_timestamps as SegmentTimestamp[] | undefined;
    const objectiveMetrics = computeObjectiveMetrics({
      transcriptText: transcript.text,
      durationSeconds: recording.duration_seconds,
      segments,
    });

    // 8. Check for a previous completed session for the same prompt to enable retry comparison
    let previousAttemptContext: import("@/lib/ai/prompts").PreviousAttemptContext | null = null;
    if (session.prompt_id) {
      try {
        const { data: prevSessions } = await supabase
          .from("practice_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("prompt_id", session.prompt_id)
          .eq("status", "completed")
          .neq("id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (prevSessions && prevSessions.length > 0) {
          const prevId = prevSessions[0].id;
          const { data: prevEvaluation } = await supabase
            .from("evaluations")
            .select("overall_score, analysis_json")
            .eq("session_id", prevId)
            .maybeSingle();

          const { data: prevRecording } = await supabase
            .from("recordings")
            .select("id")
            .eq("session_id", prevId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let prevTranscriptText = "";
          if (prevRecording) {
            const { data: prevTranscript } = await supabase
              .from("transcripts")
              .select("text")
              .eq("recording_id", prevRecording.id)
              .maybeSingle();
            prevTranscriptText = prevTranscript?.text || "";
          }

          if (prevEvaluation) {
            previousAttemptContext = {
              overall_score: prevEvaluation.overall_score,
              metrics: prevEvaluation.analysis_json?.objective_metrics || {
                word_count: 0,
                duration_seconds: 0,
                wpm: 0,
                filler_count: 0,
                long_pause_count: 0,
              },
              transcript: prevTranscriptText,
            };
          }
        }
      } catch (prevErr) {
        console.warn("Could not fetch previous attempt context for comparison:", prevErr);
      }
    }

    // 9. Prepare context for evaluation, including known recurring mistakes and previous attempt
    const promptData = session.practice_prompts;
    const categoryData = promptData?.practice_categories;
    const knownMistakes = await fetchKnownMistakeKeys(supabase, user.id, 10);

    const evaluationProvider = getGeminiEvaluationProvider();
    const evaluationResponse = await evaluationProvider.evaluate({
      role: profile?.role || "Professional",
      professional_context: profile?.professional_context || "Workplace communication",
      category: categoryData?.name || "Professional speaking",
      scenario: promptData?.prompt || "Spoken response",
      current_focus: promptData?.expected_skills?.join(", ") || "Clarity and confidence",
      known_mistakes: knownMistakes,
      objective_metrics: objectiveMetrics,
      transcript: transcript.text,
      previous_attempt: previousAttemptContext,
    });

    const evalData = evaluationResponse.evaluation;

    // Guarantee deterministic score delta if retry comparison exists
    if (previousAttemptContext) {
      const exactDelta = Math.round(evalData.overall_score - previousAttemptContext.overall_score);
      if (evalData.comparison) {
        evalData.comparison.overall_delta = exactDelta;
      } else {
        evalData.comparison = {
          overall_delta: exactDelta,
          improved: exactDelta >= 0 ? ["Overall confidence and clarity"] : [],
          still_needs_work: exactDelta < 0 ? ["Consistent pacing and phrasing"] : [],
        };
      }
    }

    // 9. Persist evaluation
    const { data: savedEvaluation, error: insertError } = await supabase
      .from("evaluations")
      .upsert(
        {
          session_id: sessionId,
          user_id: user.id,
          overall_score: evalData.overall_score,
          fluency_score: evalData.scores.fluency,
          grammar_score: evalData.scores.grammar,
          vocabulary_score: evalData.scores.vocabulary,
          clarity_score: evalData.scores.clarity,
          professionalism_score: evalData.scores.professionalism,
          structure_score: evalData.scores.structure,
          filler_control_score: evalData.scores.filler_control,
          pace_wpm: evalData.objective_metrics.wpm,
          analysis_json: evalData,
          model_provider: evaluationResponse.modelProvider,
          model_name: evaluationResponse.modelName,
        },
        { onConflict: "session_id" }
      )
      .select("*")
      .single();

    if (insertError || !savedEvaluation) {
      throw new Error(`Failed to persist evaluation: ${insertError?.message || "Insert failed"}`);
    }

    // 10. Sync mistake intelligence (deduplication, occurrence tracking, evaluation linking)
    if (evalData.recurring_mistakes && evalData.recurring_mistakes.length > 0) {
      await syncEvaluationMistakes(supabase, {
        userId: user.id,
        evaluationId: savedEvaluation.id,
        recurringMistakes: evalData.recurring_mistakes,
        corrections: evalData.corrections || [],
      });
    }

    // 10. Update practice_session to completed
    await supabase
      .from("practice_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    return {
      success: true,
      evaluation: savedEvaluation as unknown as EvaluateSessionResult["evaluation"],
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred during evaluation.";

    console.error("Evaluation error:", errorMessage);

    // Keep transcript intact and mark session as failed
    await supabase
      .from("practice_sessions")
      .update({ status: "failed" })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
