import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { Mic, Clock, Target, CheckCircle2, Award } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Validate server environment on dashboard load
  const env = getServerEnv();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const userGreeting = profile?.display_name || user?.email?.split("@")[0] || "there";

  // Fetch prompts filtered by role
  const { data: prompts } = await supabase
    .from("practice_prompts")
    .select("*, practice_categories(name)")
    .contains("role_scope", [profile?.role || ""])
    .order("difficulty", { ascending: true })
    .limit(5);

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Good day, {userGreeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome to your private English communication training space.
          </p>
          <div className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            {profile?.role || "User"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-1.5 text-xs font-medium">
            <Link href="/practice">
              <Mic size={14} />
              Start Practice Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Overall Score</span>
            <Award size={16} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">--</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Awaiting your first evaluated session
          </p>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Speaking Time</span>
            <Clock size={16} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">0</span>
            <span className="text-xs text-muted-foreground">min</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tracked across all recorded answers
          </p>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Sessions Completed</span>
            <Target size={16} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">0</span>
            <span className="text-xs text-muted-foreground">sessions</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Interview & scenario practices
          </p>
        </div>
      </div>

      {/* Recommended Prompts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          Recommended for you
        </h2>
        {prompts && prompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt: any) => (
              <div key={prompt.id} className="p-5 rounded-xl border border-border bg-card flex flex-col hover:border-primary/50 transition-colors">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {prompt.practice_categories?.name}
                </div>
                <h3 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                  {prompt.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {prompt.context}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock size={12} />
                    ~{prompt.estimated_minutes} min
                  </div>
                  <Button size="sm" variant="secondary" className="h-7 text-xs" asChild>
                    <Link href={`/practice/${prompt.id}`}>Practice</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-border bg-card text-center text-sm text-muted-foreground">
            No practice prompts found for your role yet.
          </div>
        )}
      </div>

    </div>
  );
}
