"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface VocabularyItem {
  entity: string;
  category: string;
}

const vocabularySchema = z
  .array(
    z.object({
      entity: z.string().trim().min(1).max(100),
      category: z.string().trim().min(1).max(50),
    })
  )
  .max(200);

export async function updateUserVocabulary(
  input: VocabularyItem[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = vocabularySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid vocabulary." };
  }
  const items = parsed.data;

  // user_vocabulary is unique on (user_id, entity), so keep one row per entity.
  const byEntity = new Map<string, VocabularyItem>();
  for (const item of items) {
    const entity = item.entity.trim();
    if (entity && !byEntity.has(entity)) {
      byEntity.set(entity, { entity, category: item.category || "General" });
    }
  }
  const desired = Array.from(byEntity.values());

  try {
    // Upsert first and delete stale rows afterwards, so a failure part-way
    // through never leaves the user with less vocabulary than they started with.
    if (desired.length > 0) {
      const { error: upsertError } = await supabase.from("user_vocabulary").upsert(
        desired.map((item) => ({ user_id: user.id, ...item })),
        { onConflict: "user_id,entity" }
      );
      if (upsertError) throw upsertError;
    }

    const { data: existing, error: selectError } = await supabase
      .from("user_vocabulary")
      .select("id, entity")
      .eq("user_id", user.id);
    if (selectError) throw selectError;

    const staleIds = (existing ?? [])
      .filter((row) => !byEntity.has(row.entity))
      .map((row) => row.id);

    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_vocabulary")
        .delete()
        .eq("user_id", user.id)
        .in("id", staleIds);
      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to update vocabulary:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update vocabulary.",
    };
  }
}
