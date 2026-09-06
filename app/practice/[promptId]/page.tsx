import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Clock, Target, ChevronLeft, Lightbulb } from "lucide-react";
import Link from "next/link";
import { RecordingBar } from "@/components/recording/recording-bar";

export default async function PracticePage({ params }: { params: { promptId: string } | Promise<{ promptId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Handle Next.js 15 params standard
  const resolvedParams = await Promise.resolve(params);
  const promptId = resolvedParams.promptId;

  const { data: prompt } = await supabase
    .from("practice_prompts")
    .select("*, practice_categories(name)")
    .eq("id", promptId)
    .single();

  if (!prompt) {
    notFound();
  }

  return (
    <div className="p-6 pb-32 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/70 pb-6">
        <Link 
          href="/practice" 
          className="p-2 -ml-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {prompt.practice_categories?.name}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {prompt.title}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Scenario Details */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Target size={16} className="text-primary" />
            Scenario
          </h2>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {prompt.context}
          </p>
        </div>

        {/* The Prompt */}
        <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Lightbulb size={16} />
            Your Task
          </h2>
          <p className="text-lg font-medium text-foreground leading-relaxed">
            {prompt.prompt}
          </p>
        </div>
        
        {/* Expected Skills & Meta */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          {prompt.expected_skills && prompt.expected_skills.length > 0 && (
            <div className="flex-1 p-5 rounded-xl border border-border bg-card/50">
              <div className="text-xs font-medium text-muted-foreground mb-3">Target Skills</div>
              <div className="flex flex-wrap gap-2">
                {prompt.expected_skills.map((skill: string) => (
                  <span key={skill} className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="sm:w-48 p-5 rounded-xl border border-border bg-card/50 flex flex-col justify-center">
            <div className="text-xs font-medium text-muted-foreground mb-2">Suggested Time</div>
            <div className="flex items-center gap-2 text-foreground">
              <Clock size={16} className="text-primary" />
              <span className="font-semibold">{prompt.estimated_minutes} minutes</span>
            </div>
          </div>
        </div>
      </div>

      <RecordingBar promptId={prompt.id} categoryId={prompt.category_id} />
    </div>
  );
}