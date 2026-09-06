"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface MistakeRecord {
  id: string;
  user_id: string;
  canonical_key: string;
  type: string;
  incorrect_example: string | null;
  corrected_example: string | null;
  explanation: string | null;
  severity: "high" | "medium" | "low" | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetMistakesFilter {
  type?: string;
  resolved?: boolean;
  search?: string;
}

export async function getUserMistakes(
  filters?: GetMistakesFilter
): Promise<{ success: boolean; mistakes: MistakeRecord[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, mistakes: [], error: "Unauthorized" };
    }

    let query = supabase
      .from("mistakes")
      .select("*")
      .eq("user_id", user.id);

    if (filters?.resolved !== undefined) {
      query = query.eq("resolved", filters.resolved);
    }

    if (filters?.type && filters.type !== "all") {
      query = query.eq("type", filters.type);
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      query = query.or(
        `canonical_key.ilike.${term},incorrect_example.ilike.${term},corrected_example.ilike.${term}`
      );
    }

    query = query.order("occurrence_count", { ascending: false }).order("last_seen_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { success: false, mistakes: [], error: error.message };
    }

    return { success: true, mistakes: (data as MistakeRecord[]) || [] };
  } catch (err) {
    return {
      success: false,
      mistakes: [],
      error: err instanceof Error ? err.message : "Failed to load mistakes",
    };
  }
}

export async function toggleMistakeResolved(
  mistakeId: string
): Promise<{ success: boolean; resolved?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch current status
    const { data: mistake, error: fetchError } = await supabase
      .from("mistakes")
      .select("id, resolved")
      .eq("id", mistakeId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !mistake) {
      return { success: false, error: "Mistake not found" };
    }

    const nextState = !mistake.resolved;

    // 2. Update state
    const { error: updateError } = await supabase
      .from("mistakes")
      .update({
        resolved: nextState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mistakeId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/mistakes");
    revalidatePath("/dashboard");

    return { success: true, resolved: nextState };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle mistake status",
    };
  }
}

export async function getTopRecurringWeaknesses(
  limit = 5
): Promise<{ success: boolean; weaknesses: MistakeRecord[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, weaknesses: [], error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("mistakes")
      .select("*")
      .eq("user_id", user.id)
      .eq("resolved", false)
      .order("occurrence_count", { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, weaknesses: [], error: error.message };
    }

    return { success: true, weaknesses: (data as MistakeRecord[]) || [] };
  } catch (err) {
    return {
      success: false,
      weaknesses: [],
      error: err instanceof Error ? err.message : "Failed to load weaknesses",
    };
  }
}
