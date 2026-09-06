"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSessionSchema = z.object({
  promptId: z.string().uuid("Invalid prompt ID"),
  categoryId: z.string().uuid("Invalid category ID").nullable().optional(),
  mode: z.enum(["practice", "challenge"]).default("practice"),
});

export async function createPracticeSession(
  rawPromptId: string,
  rawCategoryId?: string | null,
  rawMode: string = "practice"
) {
  try {
    const { promptId, categoryId, mode } = createSessionSchema.parse({
      promptId: rawPromptId,
      categoryId: rawCategoryId,
      mode: rawMode,
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("Unauthorized createPracticeSession");
      throw new Error("Unauthorized");
    }

    const { data: session, error } = await supabase
      .from("practice_sessions")
      .insert({
        user_id: user.id,
        prompt_id: promptId,
        category_id: categoryId || null,
        mode: mode,
        status: "created",
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create practice session in DB");
      throw new Error(error.message);
    }

    return session.id;
  } catch (err) {
    logger.error({ err }, "Error in createPracticeSession");
    throw err;
  }
}

const saveRecordingSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  storagePath: z.string().min(1, "Storage path required"),
  durationSeconds: z.number().positive(),
  fileSizeBytes: z.number().positive(),
  mimeType: z.string().min(1, "Mime type required"),
});

export async function saveRecordingMetadata(
  rawSessionId: string,
  rawStoragePath: string,
  rawDurationSeconds: number,
  rawFileSizeBytes: number,
  rawMimeType: string
) {
  try {
    const { sessionId, storagePath, durationSeconds, fileSizeBytes, mimeType } = saveRecordingSchema.parse({
      sessionId: rawSessionId,
      storagePath: rawStoragePath,
      durationSeconds: rawDurationSeconds,
      fileSizeBytes: rawFileSizeBytes,
      mimeType: rawMimeType,
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("Unauthorized saveRecordingMetadata");
      throw new Error("Unauthorized");
    }

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

    if (recordingError) {
      logger.error({ err: recordingError }, "Failed to insert recording metadata");
      throw new Error(recordingError.message);
    }

    // Update session
    const { error: sessionError } = await supabase
      .from("practice_sessions")
      .update({ 
        status: "uploaded",
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (sessionError) {
      logger.error({ err: sessionError }, "Failed to update session status");
      throw new Error(sessionError.message);
    }

    return { success: true };
  } catch (err) {
    logger.error({ err }, "Error in saveRecordingMetadata");
    throw err;
  }
}