"use server";

import { createClient } from "@/lib/supabase/server";
import { getGroqSpeechProvider } from "@/lib/providers/groq-speech";

export interface TranscribeSessionResult {
  success: boolean;
  transcript?: {
    id: string;
    text: string;
    language: string | null;
    word_count: number | null;
    segment_timestamps: unknown;
    word_timestamps: unknown;
  };
  error?: string;
}

export async function transcribeSession(
  sessionId: string,
  options?: { force?: boolean }
): Promise<TranscribeSessionResult> {
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

  // 2. Fetch the latest recording for this session
  const { data: recording, error: recordingError } = await supabase
    .from("recordings")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recordingError || !recording) {
    return { success: false, error: "No recording found for this session." };
  }

  // 3. Check if transcript already exists and we're not forcing re-transcription
  if (!options?.force && recording.transcription_status === "completed") {
    const { data: existingTranscript } = await supabase
      .from("transcripts")
      .select("id, text, language, word_count, segment_timestamps, word_timestamps")
      .eq("recording_id", recording.id)
      .eq("user_id", user.id)
      .single();

    if (existingTranscript) {
      return { success: true, transcript: existingTranscript };
    }
  }

  // 4. Update status to transcribing
  await supabase
    .from("practice_sessions")
    .update({ status: "transcribing" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  await supabase
    .from("recordings")
    .update({ transcription_status: "in_progress" })
    .eq("id", recording.id)
    .eq("user_id", user.id);

  try {
    // 5. Download private audio file from Supabase Storage
    const { data: audioBlob, error: downloadError } = await supabase.storage
      .from("recordings")
      .download(recording.storage_path);

    if (downloadError || !audioBlob) {
      throw new Error(
        `Failed to download audio recording: ${downloadError?.message || "File not found"}`
      );
    }

    // 6. Transcribe using Groq Speech Provider
    const provider = getGroqSpeechProvider();
    const fileName = recording.storage_path.split("/").pop() || "audio.webm";

    const transcription = await provider.transcribe({
      file: audioBlob,
      fileName,
      language: "en",
    });

    if (!transcription.text && transcription.text !== "") {
      throw new Error("No transcription returned from speech provider.");
    }

    // 7. Persist transcript
    const { data: savedTranscript, error: transcriptError } = await supabase
      .from("transcripts")
      .upsert(
        {
          recording_id: recording.id,
          user_id: user.id,
          text: transcription.text,
          language: transcription.language || "en",
          word_count: transcription.wordCount,
          segment_timestamps: transcription.segments || [],
          word_timestamps: transcription.words || [],
        },
        { onConflict: "recording_id" }
      )
      .select("id, text, language, word_count, segment_timestamps, word_timestamps")
      .single();

    if (transcriptError) {
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    // 8. Update recording & session status to success (ready for Phase 5: analyzing)
    await supabase
      .from("recordings")
      .update({
        transcription_status: "completed",
        provider: "groq",
        provider_model: "whisper-large-v3-turbo",
      })
      .eq("id", recording.id)
      .eq("user_id", user.id);

    await supabase
      .from("practice_sessions")
      .update({ status: "analyzing" })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    return {
      success: true,
      transcript: savedTranscript,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred during transcription.";

    console.error("Transcription error:", errorMessage);

    // Keep the recording intact, update statuses to failed
    await supabase
      .from("recordings")
      .update({ transcription_status: "failed" })
      .eq("id", recording.id)
      .eq("user_id", user.id);

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
