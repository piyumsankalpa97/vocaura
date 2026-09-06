"use client";

import { EvaluationResult } from "@/lib/ai/evaluation-schema";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Repeat,
  Info,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SessionEvaluationViewProps {
  evaluation: {
    id?: string;
    overall_score: number;
    fluency_score?: number | null;
    grammar_score?: number | null;
    vocabulary_score?: number | null;
    clarity_score?: number | null;
    professionalism_score?: number | null;
    structure_score?: number | null;
    filler_control_score?: number | null;
    pace_wpm?: number | null;
    analysis_json: EvaluationResult;
    model_name?: string | null;
    created_at?: string;
  };
  promptId: string;
}

function getScoreBadge(score: number): { label: string; colorClass: string } {
  if (score >= 90) return { label: "Excellent", colorClass: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" };
  if (score >= 75) return { label: "Strong", colorClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" };
  if (score >= 60) return { label: "Functional", colorClass: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" };
  if (score >= 40) return { label: "Developing", colorClass: "text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/20" };
  return { label: "Needs Focus", colorClass: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" };
}

export function SessionEvaluationView({ evaluation, promptId }: SessionEvaluationViewProps) {
  const analysis = evaluation.analysis_json;
  const badge = getScoreBadge(evaluation.overall_score);

  const categoryScores = [
    { label: "Fluency", score: evaluation.fluency_score ?? analysis.scores?.fluency ?? 0, weight: "20%" },
    { label: "Grammar", score: evaluation.grammar_score ?? analysis.scores?.grammar ?? 0, weight: "15%" },
    { label: "Vocabulary", score: evaluation.vocabulary_score ?? analysis.scores?.vocabulary ?? 0, weight: "10%" },
    { label: "Clarity", score: evaluation.clarity_score ?? analysis.scores?.clarity ?? 0, weight: "20%" },
    { label: "Professionalism", score: evaluation.professionalism_score ?? analysis.scores?.professionalism ?? 0, weight: "15%" },
    { label: "Structure", score: evaluation.structure_score ?? analysis.scores?.structure ?? 0, weight: "10%" },
    { label: "Filler Control", score: evaluation.filler_control_score ?? analysis.scores?.filler_control ?? 0, weight: "10%" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* 1. Overall Score Hero */}
      <div className="rounded-2xl bg-card border border-border/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/60">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Performance Evaluation
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <span>{Math.round(evaluation.overall_score)}</span>
              <span className="text-muted-foreground text-lg sm:text-xl font-normal">/ 100</span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium border ${badge.colorClass}`}
              >
                {badge.label}
              </span>
            </h2>
          </div>

          {/* Quick Objective Metrics */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-muted-foreground block text-[10px] uppercase">Duration</span>
              <span className="font-semibold text-foreground">
                {analysis.objective_metrics.duration_seconds}s
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-muted-foreground block text-[10px] uppercase">Pace</span>
              <span className="font-semibold text-foreground">
                {analysis.objective_metrics.wpm} WPM
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-muted-foreground block text-[10px] uppercase">Word Count</span>
              <span className="font-semibold text-foreground">
                {analysis.objective_metrics.word_count}
              </span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-muted-foreground block text-[10px] uppercase">Fillers</span>
              <span className="font-semibold text-foreground">
                {analysis.objective_metrics.filler_count}
              </span>
            </div>
          </div>
        </div>

        {/* Narrative Summary */}
        <div className="pt-5 text-sm sm:text-base leading-relaxed text-foreground/90 font-medium">
          {analysis.summary}
        </div>
      </div>

      {/* Retry Comparison Section (Phase 8) */}
      {analysis.comparison && (
        <div className="rounded-2xl bg-card border border-primary/25 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Attempt Comparison
                </div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  Progress Since Previous Attempt
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Score Delta:</span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                  analysis.comparison.overall_delta > 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : analysis.comparison.overall_delta < 0
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {analysis.comparison.overall_delta > 0
                  ? `+${analysis.comparison.overall_delta} pts`
                  : `${analysis.comparison.overall_delta} pts`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* What improved */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={14} />
                <span>What Improved</span>
              </div>
              {analysis.comparison.improved.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-foreground/90">
                  {analysis.comparison.improved.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Performance was consistent with the previous attempt.</p>
              )}
            </div>

            {/* Still needs work */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} />
                <span>Still Needs Focus</span>
              </div>
              {analysis.comparison.still_needs_work.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-foreground/90">
                  {analysis.comparison.still_needs_work.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No recurring issues flagged in this attempt.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Category Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Core Communication Competencies
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {categoryScores.map((cat) => (
            <div
              key={cat.label}
              className="p-4 rounded-xl bg-card border border-border/70 hover:border-border transition-colors space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                <span className="text-xs font-bold text-foreground font-mono">
                  {Math.round(cat.score)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cat.score >= 75
                      ? "bg-emerald-600 dark:bg-emerald-500"
                      : cat.score >= 60
                      ? "bg-amber-600 dark:bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, cat.score))}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>Weight {cat.weight}</span>
                <span>{getScoreBadge(cat.score).label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Strengths & Improvements in Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="rounded-2xl bg-card border border-border/70 p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h3>What You Did Well</h3>
          </div>
          <ul className="space-y-2.5">
            {analysis.strengths.map((strength, idx) => (
              <li
                key={idx}
                className="text-sm text-foreground/90 leading-relaxed p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-2.5"
              >
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-0.5">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="rounded-2xl bg-card border border-border/70 p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <Lightbulb size={18} className="text-amber-600 dark:text-amber-400" />
            <h3>Areas for Improvement</h3>
          </div>
          {analysis.improvements.length > 0 ? (
            <div className="space-y-3">
              {analysis.improvements.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-sm">{item.issue}</span>
                    <span
                      className={`uppercase text-[10px] px-2 py-0.5 rounded font-medium ${
                        item.priority === "high"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                          : item.priority === "medium"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.priority} priority
                    </span>
                  </div>
                  <div className="text-muted-foreground italic">
                    Evidence: &quot;{item.evidence}&quot;
                  </div>
                  <div className="text-foreground font-medium pt-1 border-t border-border/40 flex items-start gap-1.5">
                    <span className="text-primary font-bold">→</span>
                    <span>{item.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No significant weaknesses observed.</p>
          )}
        </div>
      </div>

      {/* 4. Better Wording (Corrections) */}
      {analysis.corrections && analysis.corrections.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/70 p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <Sparkles size={18} className="text-primary" />
            <h3>Refined Phrasing & Natural Corrections</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {analysis.corrections.map((corr, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-background border border-border/80 space-y-2.5 text-xs shadow-sm"
              >
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Heard in response:
                  </div>
                  <div className="line-through text-muted-foreground/80 font-mono bg-muted/40 p-1.5 rounded">
                    {corr.heard}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <ArrowRight size={12} />
                    Recommended alternative:
                  </div>
                  <div className="text-foreground font-semibold bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded font-mono">
                    {corr.better}
                  </div>
                </div>

                <p className="text-muted-foreground pt-1 border-t border-border/50 text-[11px] leading-snug">
                  {corr.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recurring Mistakes Section */}
      {analysis.recurring_mistakes && analysis.recurring_mistakes.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/70 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-semibold text-base">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
              <h3>Identified Mistake Patterns</h3>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7 text-muted-foreground hover:text-foreground gap-1">
              <Link href="/mistakes">
                View mistake history
                <ArrowRight size={12} />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border/60">
            {analysis.recurring_mistakes.map((mistake, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {mistake.canonical_key}
                    </span>
                    <span className="text-[10px] uppercase bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                      {mistake.type}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Example: &quot;{mistake.example}&quot;
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-amber-600 uppercase border border-amber-500/30 px-2 py-0.5 rounded">
                  {mistake.severity} severity
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Retry Task Call to Action */}
      {analysis.retry_task && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 text-sm">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Repeat size={16} className="text-primary" />
              <span>Recommended Next Attempt</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
              {analysis.retry_task.instruction} Focus on:{" "}
              <span className="font-medium text-foreground">{analysis.retry_task.focus}</span>
            </p>
          </div>
          <Button asChild className="shrink-0 text-xs gap-1.5">
            <Link href={`/practice/${promptId}`}>
              <Repeat size={14} />
              Retry Practice Now
            </Link>
          </Button>
        </div>
      )}

      {/* 7. Pronunciation Note & Metadata */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border/50">
        <Info size={15} className="shrink-0" />
        <span>{analysis.pronunciation_note}</span>
      </div>
    </div>
  );
}
