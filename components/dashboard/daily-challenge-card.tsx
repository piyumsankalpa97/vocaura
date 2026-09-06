"use client";

import { useState, useTransition } from "react";
import { Sparkles, ArrowRight, Clock, Target, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDailyChallengeAction, TodayChallengeResult } from "@/app/actions/challenge";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DailyChallengeCardProps {
  initialChallenge: TodayChallengeResult;
  userRole?: string;
}

export function DailyChallengeCard({ initialChallenge, userRole }: DailyChallengeCardProps) {
  const [challenge, setChallenge] = useState<TodayChallengeResult>(initialChallenge);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateDailyChallengeAction();
      if (res.success && res.promptId) {
        router.refresh();
        router.push(`/practice/${res.promptId}`);
      } else {
        setError(res.error || "Unable to generate challenge. Please try again.");
      }
    });
  };

  const isCompleted = challenge.sessionStatus === "completed";

  return (
    <div className="p-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Personalized Training
            </div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              Today&apos;s Speaking Challenge
            </h2>
          </div>
        </div>

        {challenge.hasChallenge && challenge.prompt && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-primary" />
              ~{challenge.prompt.estimated_minutes} min
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={13} />
                Completed
              </span>
            )}
          </div>
        )}
      </div>

      {challenge.hasChallenge && challenge.prompt ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {challenge.prompt.title}
            </h3>
            {challenge.prompt.context && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {challenge.prompt.context}
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-background/80 border border-border/70 text-sm text-foreground/90 leading-relaxed font-medium">
            &ldquo;{challenge.prompt.prompt}&rdquo;
          </div>

          {challenge.prompt.expected_skills && challenge.prompt.expected_skills.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target size={13} className="text-primary" />
                Target weakness:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {challenge.prompt.expected_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-mono text-[11px]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end">
            <Button asChild size="sm" className="gap-1.5 text-xs font-medium">
              <Link href={`/practice/${challenge.prompt.id}`}>
                {isCompleted ? "Practice Challenge Again" : "Start Today's Challenge"}
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get a 60–120 second speaking prompt tailored specifically to your role as{" "}
            <span className="font-semibold text-foreground">{userRole || "a professional"}</span> and
            recent recurring language patterns.
          </p>

          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground italic">
              Updated daily based on your evaluated sessions
            </span>
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              size="sm"
              className="gap-1.5 text-xs font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating Challenge...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Today&apos;s Challenge
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
