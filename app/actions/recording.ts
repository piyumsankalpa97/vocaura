"use server";

import { createClient } from "@/lib/supabase/server";

export async function createPracticeSession(promptId: string, categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: session, error } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: user.id,
      prompt_id: promptId,
      category_id: categoryId,
      mode: "practice",
      status: "created",
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return session.id;
}

export async function saveRecordingMetadata(
  sessionId: string,
  storagePath: string,
  durationSeconds: number,
  fileSizeBytes: number,
  mimeType: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Insert recording
  const { error: recordingError } = await supabase
    .from("recordings")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      storage_path: storagePath,
      mime_type: mimeType,
      duration_seconds: durationSeconds,
      file_size_bytes: fileSizeBytes,
    });

  if (recordingError) throw new Error(recordingError.message);

  // Update session
  const { error: sessionError } = await supabase
    .from("practice_sessions")
    .update({ 
      status: "uploaded",
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (sessionError) throw new Error(sessionError.message);

  return { success: true };
}