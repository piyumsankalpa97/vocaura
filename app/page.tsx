import { Suspense } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { VocauraLogo } from "@/components/vocaura-logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Mic, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";


async function HeroCta() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
      <Button asChild size="lg" className="rounded-md font-medium gap-2 px-6">
        <Link href={user ? "/dashboard" : "/auth/login"}>
          {user ? "Open Dashboard" : "Start Practicing"}
          <ArrowRight size={16} />
        </Link>
      </Button>
      {!user && (
        <Button asChild size="lg" variant="outline" className="rounded-md font-medium px-6">
          <Link href="/auth/sign-up">Create Account</Link>
        </Button>
      )}
    </div>
  );
}

function HeroCtaFallback() {
  return (
    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
      <Button size="lg" className="rounded-md font-medium gap-2 px-6 opacity-50" disabled>
        Start Practicing
        <ArrowRight size={16} />
      </Button>
      <Button size="lg" variant="outline" className="rounded-md font-medium px-6 opacity-50" disabled>
        Create Account
      </Button>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <VocauraLogo showTagline />
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Suspense fallback={<div className="w-20 h-8" />}>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center">
        {/* Editorial Hero */}
        <div className="w-full text-center max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Private Professional Trainer
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.15]">
            Practice your voice. <br />
            <span className="text-muted-foreground font-normal">
              Grow your confidence.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            A calm, structured speaking trainer designed to build spontaneous fluency,
            clarity, and professional presence when speaking under pressure.
          </p>

          <Suspense fallback={<HeroCtaFallback />}>
            <HeroCta />
          </Suspense>
        </div>

        {/* Persona Pillars Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-20">
          {/* Persona A: Software Engineering */}
          <div className="rounded-xl border border-border bg-card p-7 flex flex-col justify-between space-y-6 shadow-sm hover:border-border/80 transition-colors">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground text-xs font-bold font-mono">
                DEV
              </div>
              <h3 className="text-xl font-semibold text-foreground tracking-tight">
                Software Engineering & Leadership
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explain complex architectures to non-technical clients, communicate technical delays,
                professionally push back on deadlines, and master high-stakes technical interviews.
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 border-t border-border/60 pt-4 font-mono">
              <li className="flex items-center gap-2">
                <span className="text-primary font-bold">•</span> Technical explanations without jargon
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-bold">•</span> Managing difficult stakeholder pushback
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-bold">•</span> Structured problem solving (STAR)
              </li>
            </ul>
          </div>

          {/* Persona B: Healthcare & Nursing */}
          <div className="rounded-xl border border-border bg-card p-7 flex flex-col justify-between space-y-6 shadow-sm hover:border-border/80 transition-colors">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground text-xs font-bold font-mono">
                MED
              </div>
              <h3 className="text-xl font-semibold text-foreground tracking-tight">
                Clinical & Nursing Communication
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Practice empathetic patient consultations, structured clinical handovers (ISBAR),
                escalating concerns to senior doctors, and IELTS/OET style professional speaking.
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 border-t border-border/60 pt-4 font-mono">
              <li className="flex items-center gap-2">
                <span className="text-primary font-bold">•</span> Empathetic and reassuring patient tone
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-bold">•</span> Concise, structured clinical handovers
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-bold">•</span> Safe practice with zero real patient data
              </li>
            </ul>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          <div className="p-5 rounded-lg border border-border/80 bg-card/40 space-y-2.5">
            <Mic size={18} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Natural Audio Capture</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Record spontaneous responses using your browser or phone microphone with private storage.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-border/80 bg-card/40 space-y-2.5">
            <Sparkles size={18} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Evidence-Based Coaching</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Actionable feedback quoting your exact words with natural, professional alternatives.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-border/80 bg-card/40 space-y-2.5">
            <TrendingUp size={18} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Mistake Intelligence</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tracks recurring grammar and phrasing patterns across sessions so you target true habits.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-border/80 bg-card/40 space-y-2.5">
            <ShieldCheck size={18} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Private & Isolated</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Strict row-level security and private storage keep both users’ data completely confidential.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Vocaura. Built for clear, confident professional voice.</p>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/auth/sign-up" className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
