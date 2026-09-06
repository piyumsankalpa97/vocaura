import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { Mic, Clock, Target, Award, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getTopRecurringWeaknesses } from "@/app/actions/mistakes";
import { getTodayDailyChallenge } from "@/app/actions/challenge";
import { DailyChallengeCard } from "@/components/dashboard/daily-challenge-card";

import { PageHeader } from "@/components/layout/page-header";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Validate server environment on dashboard load
  getServerEnv();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  const userGreeting = profile?.display_name || user?.email?.split("@")[0] || "there";

  // Fetch top recurring weaknesses (Phase 6)
  const { weaknesses } = await getTopRecurringWeaknesses(6);

  // Fetch today's personalized challenge (Phase 8)
  const todayChallenge = await getTodayDailyChallenge();

  // Fetch prompts filtered by role
  const { data: prompts } = await supabase
    .from("practice_prompts")
    .select("*, practice_categories(name)")
    .eq("active", true)
    .contains("role_scope", [profile?.role || ""])
    .order("difficulty", { ascending: true })
    .limit(5);

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <PageHeader
        eyebrow={
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            {profile?.role || "User"}
          </div>
        }
        title={`Good day, ${userGreeting}`}
        description="Welcome to your private English communication training space."
        action={
          <Button asChild className="gap-1.5 text-xs font-medium">
            <Link href="/practice">
              <Mic size={14} />
              Start Practice Session
            </Link>
          </Button>
        }
      />

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

      {/* Personalized Daily Challenge (Phase 8) */}
      <DailyChallengeCard initialChallenge={todayChallenge} userRole={profile?.role} />

      {/* Recurring Weaknesses Card (Phase 6) */}
      <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Recurring Weaknesses
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs h-7 text-muted-foreground hover:text-foreground gap-1">
            <Link href="/mistakes">
              View all mistakes
              <ArrowRight size={12} />
            </Link>
          </Button>
        </div>

        {weaknesses && weaknesses.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {weaknesses.map((item) => (
              <Link
                key={item.id}
                href="/mistakes"
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/50 hover:bg-secondary/70 transition-all text-xs"
              >
                <span className="font-mono font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.canonical_key}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-background/80 text-[11px] font-bold text-muted-foreground border border-border/60">
                  ×{item.occurrence_count}
                </span>
                {item.type && (
                  <span className="text-[10px] text-muted-foreground capitalize">
                    ({item.type})
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-4 text-xs text-muted-foreground">
            No recurring mistake patterns detected yet. Complete practice sessions to start tracking language habits.
          </div>
        )}
      </div>

      {/* Recommended Prompts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          Recommended for you
        </h2>
        {prompts && prompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt) => (
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
