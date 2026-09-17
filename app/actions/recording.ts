"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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

const deleteSessionSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
});

export async function deletePracticeSession(rawSessionId: string) {
  try {
    const { sessionId } = deleteSessionSchema.parse({ sessionId: rawSessionId });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("Unauthorized deletePracticeSession");
      throw new Error("Unauthorized");
    }

    // 1. Fetch all recordings for this session to get their storage paths
    const { data: recordings, error: recordingsError } = await supabase
      .from("recordings")
      .select("storage_path")
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (recordingsError) {
      logger.error({ err: recordingsError }, "Failed to fetch recordings for deletion");
    }

    // 2. Delete audio files from Supabase storage if paths exist
    if (recordings && recordings.length > 0) {
      const pathsToDelete = recordings
        .map((r) => r.storage_path)
        .filter((path): path is string => Boolean(path && path.trim() !== ""));

      if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("recordings")
          .remove(pathsToDelete);

        if (storageError) {
          logger.error({ err: storageError, pathsToDelete }, "Failed to delete recordings from storage");
        }
      }
    }

    // 3. Delete session from practice_sessions (cascades to recordings, evaluations, transcripts)
    const { error: sessionError } = await supabase
      .from("practice_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (sessionError) {
      logger.error({ err: sessionError }, "Failed to delete practice session");
      throw new Error(sessionError.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/progress");
    revalidatePath("/mistakes");

    logger.info({ sessionId, userId: user.id }, "Successfully deleted practice session");
    return { success: true };
  } catch (err) {
    logger.error({ err }, "Error in deletePracticeSession");
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete session",
    };
  }
}

export async function purgeUserAudio() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("Unauthorized purgeUserAudio");
      throw new Error("Unauthorized");
    }

    // 1. Fetch all recordings belonging to the user that have a non-empty storage path
    const { data: recordings, error: fetchError } = await supabase
      .from("recordings")
      .select("id, storage_path")
      .eq("user_id", user.id)
      .not("storage_path", "is", null);

    if (fetchError) {
      logger.error({ err: fetchError }, "Failed to query recordings for purge");
      throw new Error(fetchError.message);
    }

    if (!recordings || recordings.length === 0) {
      return { success: true, count: 0 };
    }

    const pathsToDelete = recordings
      .map((r) => r.storage_path)
      .filter((path): path is string => Boolean(path && path.trim() !== ""));

    if (pathsToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("recordings")
        .remove(pathsToDelete);

      if (storageError) {
        logger.error({ err: storageError }, "Failed to remove storage files during purge");
      }
    }

    // 2. Set storage_path to null for all user's recordings
    const recordingIds = recordings.map((r) => r.id);
    const { error: updateError } = await supabase
      .from("recordings")
      .update({ storage_path: null })
      .in("id", recordingIds)
      .eq("user_id", user.id);

    if (updateError) {
      logger.error({ err: updateError }, "Failed to update recordings storage_path to null");
      throw new Error(updateError.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/progress");

    logger.info({ userId: user.id, count: pathsToDelete.length }, "Successfully purged user audio files");
    return { success: true, count: pathsToDelete.length };
  } catch (err) {
    logger.error({ err }, "Error in purgeUserAudio");
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to purge audio files",
    };
  }
}