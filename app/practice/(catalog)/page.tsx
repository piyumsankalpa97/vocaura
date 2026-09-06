import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { PracticeCatalogView, Prompt, Category } from "./practice-catalog-view";
import { Mic } from "lucide-react";

export const metadata = {
  title: "Practice Catalog | Vocaura",
  description: "Browse targeted spoken English exercises and speaking scenarios for your profession.",
};

export default async function PracticePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile for role recommendation
  let userRole = "Software Engineer";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role) {
      userRole = profile.role;
    }
  }

  // Fetch categories
  const { data: rawCategories } = await supabase
    .from("practice_categories")
    .select("id, name, slug, description, role_scope")
    .order("name");

  // Fetch active prompts
  const { data: rawPrompts } = await supabase
    .from("practice_prompts")
    .select("id, category_id, role_scope, difficulty, title, prompt, context, expected_skills, estimated_minutes, active, practice_categories(id, name, slug)")
    .eq("active", true)
    .order("difficulty", { ascending: true });

  const categories = (rawCategories || []) as Category[];
  // Supabase returns related table as object or array, cast safely
  const prompts = (rawPrompts || []).map((p: Record<string, unknown>) => ({
    ...p,
    practice_categories: Array.isArray(p.practice_categories)
      ? p.practice_categories[0]
      : p.practice_categories,
  })) as unknown as Prompt[];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Mic size={15} className="text-primary" />
            Practice Catalog
          </div>
        }
        title="Spoken English Exercises"
        description="Select a targeted speaking scenario designed for your role. Practice spontaneous responses and receive structured AI evaluation."
      />

      <PracticeCatalogView
        initialCategories={categories}
        initialPrompts={prompts}
        userRole={userRole}
      />
    </div>
  );
}
