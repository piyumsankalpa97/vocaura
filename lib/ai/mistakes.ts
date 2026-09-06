import { SupabaseClient } from "@supabase/supabase-js";
import { CorrectionItem, RecurringMistakeItem } from "./evaluation-schema";

export function findMatchingCorrection(
  example: string,
  corrections: CorrectionItem[]
): CorrectionItem | undefined {
  if (!example || !corrections || corrections.length === 0) return undefined;

  const normalizedExample = example.trim().toLowerCase();

  // 1. Exact match
  const exact = corrections.find(
    (c) => c.heard.trim().toLowerCase() === normalizedExample
  );
  if (exact) return exact;

  // 2. Substring match (either direction)
  const substring = corrections.find((c) => {
    const heard = c.heard.trim().toLowerCase();
    return (
      (heard.length > 3 && normalizedExample.includes(heard)) ||
      (normalizedExample.length > 3 && heard.includes(normalizedExample))
    );
  });
  if (substring) return substring;

  // 3. Fallback: match first word or token sequence if overlap exists
  return undefined;
}

export async function fetchKnownMistakeKeys(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 20
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("mistakes")
      .select("canonical_key")
      .eq("user_id", userId)
      .eq("resolved", false)
      .order("occurrence_count", { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.warn("Could not fetch known mistake keys:", error?.message);
      return [];
    }

    return data.map((row: { canonical_key: string }) => row.canonical_key);
  } catch (err) {
    console.warn("Error in fetchKnownMistakeKeys:", err);
    return [];
  }
}

export interface SyncEvaluationMistakesParams {
  userId: string;
  evaluationId: string;
  recurringMistakes: RecurringMistakeItem[];
  corrections: CorrectionItem[];
}

export async function syncEvaluationMistakes(
  supabase: SupabaseClient,
  params: SyncEvaluationMistakesParams
): Promise<void> {
  const { userId, evaluationId, recurringMistakes, corrections } = params;

  if (!recurringMistakes || recurringMistakes.length === 0) {
    return;
  }

  for (const item of recurringMistakes) {
    if (!item.canonical_key) continue;

    const match = findMatchingCorrection(item.example, corrections);
    const correctedExample = match?.better || null;
    const explanation = match?.why || null;

    // Check if mistake already exists for this user
    const { data: existing } = await supabase
      .from("mistakes")
      .select("id, occurrence_count, incorrect_example, corrected_example, explanation, severity")
      .eq("user_id", userId)
      .eq("canonical_key", item.canonical_key)
      .maybeSingle();

    let mistakeId: string;

    if (existing) {
      // Increment occurrence count, update last seen, and reopen if previously resolved
      const { data: updated, error: updateError } = await supabase
        .from("mistakes")
        .update({
          occurrence_count: (existing.occurrence_count || 1) + 1,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          type: item.type,
          severity: item.severity || existing.severity || "medium",
          incorrect_example: item.example || existing.incorrect_example,
          corrected_example: correctedExample || existing.corrected_example,
          explanation: explanation || existing.explanation,
          resolved: false, // Re-opened because it was observed again
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError || !updated) {
        console.error("Failed to update existing mistake:", updateError?.message);
        continue;
      }
      mistakeId = updated.id;
    } else {
      // Insert new mistake record
      const { data: inserted, error: insertError } = await supabase
        .from("mistakes")
        .insert({
          user_id: userId,
          canonical_key: item.canonical_key,
          type: item.type,
          severity: item.severity || "medium",
          incorrect_example: item.example,
          corrected_example: correctedExample,
          explanation: explanation,
          occurrence_count: 1,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          resolved: false,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("Failed to insert new mistake:", insertError?.message);
        continue;
      }
      mistakeId = inserted.id;
    }

    // Link mistake to this evaluation in evaluation_mistakes
    const { error: linkError } = await supabase
      .from("evaluation_mistakes")
      .upsert(
        {
          evaluation_id: evaluationId,
          mistake_id: mistakeId,
          example_in_session: item.example,
        },
        { onConflict: "evaluation_id,mistake_id" }
      );

    if (linkError) {
      console.warn("Failed to link evaluation_mistakes:", linkError.message);
    }
  }
}
