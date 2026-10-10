"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  applyCorrectionsToText,
  filterApplicableCorrections,
  transcriptCorrectionSchema,
  TranscriptCorrection,
} from "@/lib/ai/optimization-schema";
import { logger } from "@/lib/logger";

export interface FinalizeTranscriptResult {
  success: boolean;
  finalizedText?: string;
  error?: string;
}

const approvedCorrectionsSchema = z.array(transcriptCorrectionSchema).max(100);

/**
 * Applies the corrections the user approved in the review card and marks the
 * session ready for evaluation. The client starts evaluation separately so a
 * failure there can be retried without re-finalizing.
 */
export async function finalizeSessionTranscript(
  sessionId: string,
  approvedCorrections: TranscriptCorrection[]
): Promise<FinalizeTranscriptResult> {
  const parsedCorrections = approvedCorrectionsSchema.safeParse(approvedCorrections);
  if (!parsedCorrections.success) {
    return { success: false, error: "Invalid corrections submitted." };
  }

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
    .select("id, text, original_text, segment_timestamps")
    .eq("recording_id", recording.id)
    .eq("user_id", user.id)
    .single();

  if (transcriptError || !transcript) {
    return { success: false, error: "Transcript not found." };
  }

  const baseText = transcript.original_text || transcript.text || "";
  const corrections = filterApplicableCorrections(baseText, parsedCorrections.data);
  const finalizedText = applyCorrectionsToText(baseText, corrections);
  const wordCount = finalizedText.trim().split(/\s+/).filter(Boolean).length;

  // Also apply corrections to segments if available
  let updatedSegments = transcript.segment_timestamps;
  if (Array.isArray(transcript.segment_timestamps)) {
    updatedSegments = transcript.segment_timestamps.map((seg: { id: number; start: number; end: number; text: string }) => ({
      ...seg,
      text: applyCorrectionsToText(seg.text, corrections),
    }));
  }

  // 4. Save finalized text to transcripts table
  const { error: updateTranscriptError } = await supabase
    .from("transcripts")
    .update({
      text: finalizedText,
      // Older transcripts have no original_text; keep the raw Whisper text.
      original_text: baseText,
      word_count: wordCount,
      segment_timestamps: updatedSegments,
      optimization_changes: corrections,
    })
    .eq("id", transcript.id)
    .eq("user_id", user.id);

  if (updateTranscriptError) {
    return { success: false, error: updateTranscriptError.message };
  }

  // 5. Remember confirmed entities for future sessions. Best-effort: a failure
  // here shouldn't block analysis, but it is logged rather than ignored.
  const vocabByEntity = new Map<string, { user_id: string; entity: string; category: string }>();
  for (const corr of corrections) {
    vocabByEntity.set(corr.corrected, {
      user_id: user.id,
      entity: corr.corrected,
      category: corr.category || "General",
    });
  }
  if (vocabByEntity.size > 0) {
    const { error: vocabError } = await supabase
      .from("user_vocabulary")
      .upsert(Array.from(vocabByEntity.values()), { onConflict: "user_id,entity" });
    if (vocabError) {
      logger.error({ err: vocabError, sessionId }, "Failed to save confirmed vocabulary");
    }
  }

  // 6. Update session status to analyzing
  const { error: statusError } = await supabase
    .from("practice_sessions")
    .update({ status: "analyzing" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  return {
    success: true,
    finalizedText,
  };
}
