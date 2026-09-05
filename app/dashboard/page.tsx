import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { Mic, Clock, Target, CheckCircle2, Award } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validate server environment on dashboard load
  const env = getServerEnv();

  // Extract a user-friendly name if possible from email or metadata
  const userGreeting = user?.email?.split("@")[0] || "there";

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

      {/* Phase 1 Verification & Status Card */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Phase 1 Foundation Operational
          </h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          Authentication, session routing, and environment validation are fully configured.
          The Vocaura dual-theme system (Light / Dark) is active. The application is ready for
          Phase 2 database migrations and role-specific prompt seeding.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-md bg-card/60 border border-border/80 text-xs space-y-1 font-mono">
            <span className="text-muted-foreground block text-[11px]">Database & Auth</span>
            <span className="text-foreground font-medium">Supabase Verified</span>
          </div>
          <div className="p-3 rounded-md bg-card/60 border border-border/80 text-xs space-y-1 font-mono">
            <span className="text-muted-foreground block text-[11px]">Speech-to-Text</span>
            <span className="text-foreground font-medium">Groq Whisper Ready</span>
          </div>
          <div className="p-3 rounded-md bg-card/60 border border-border/80 text-xs space-y-1 font-mono">
            <span className="text-muted-foreground block text-[11px]">Evaluation Model</span>
            <span className="text-foreground font-medium">{env.GEMINI_MODEL}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
