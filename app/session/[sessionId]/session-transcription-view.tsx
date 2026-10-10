"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeSession } from "@/app/actions/transcribe";
import { optimizeSessionTranscript } from "@/app/actions/optimize";
import { finalizeSessionTranscript } from "@/app/actions/finalize-transcript";
import { evaluateSession } from "@/app/actions/evaluate";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  Volume2,
  FileText,
  Clock,
  Sparkles,
  Layers,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SessionEvaluationView } from "./session-evaluation-view";
import { TranscriptReviewCard } from "./transcript-review-card";
import { EvaluationResult } from "@/lib/ai/evaluation-schema";
import { TranscriptCorrection } from "@/lib/ai/optimization-schema";
import { deletePracticeSession } from "@/app/actions/recording";
import { deriveInitialPipelineState, PipelineStage } from "@/lib/session-pipeline";

interface SessionTranscriptionViewProps {
  sessionId: string;
  sessionStatus: string;
  prompt: {
    id: string;
    title: string;
    prompt: string;
    context?: string | null;
    categoryName?: string;
  };
  initialRecording: {
    id: string;
    storage_path: string;
    duration_seconds?: number | null;
    transcription_status: string;
  } | null;
  initialTranscript: {
    id: string;
    text: string;
    original_text?: string | null;
    language: string | null;
    word_count: number | null;
    segment_timestamps: unknown;
    optimization_changes?: unknown;
  } | null;
  initialEvaluation: {
    id?: string;
    session_id: string;
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
    model_provider?: string | null;
    model_name?: string | null;
    created_at?: string;
  } | null;
  audioUrl: string | null;
}

export function SessionTranscriptionView({
  sessionId,
  sessionStatus,
  prompt,
  initialRecording,
  initialTranscript,
  initialEvaluation,
  audioUrl,
}: SessionTranscriptionViewProps) {
  const router = useRouter();
  const [transcript, setTranscript] = useState(initialTranscript);
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSegments, setShowSegments] = useState(false);

  // Pipeline: transcribe -> optimize -> review -> evaluate -> done.
  // Seeded from persisted state so a reload resumes the right stage.
  const [initialState] = useState(() =>
    deriveInitialPipelineState({
      sessionStatus,
      hasRecording: Boolean(initialRecording),
      transcriptionStatus: initialRecording?.transcription_status ?? null,
      hasTranscript: Boolean(initialTranscript?.text),
      hasEvaluation: Boolean(initialEvaluation),
    })
  );
  const [stage, setStage] = useState<PipelineStage>(initialState.stage);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(initialState.error);

  // Review inputs: the raw Whisper text and the suggested corrections
  const [rawText, setRawText] = useState<string>(
    initialTranscript?.original_text || initialTranscript?.text || ""
  );
  const [corrections, setCorrections] = useState<TranscriptCorrection[]>(() =>
    Array.isArray(initialTranscript?.optimization_changes)
      ? (initialTranscript.optimization_changes as TranscriptCorrection[])
      : []
  );

  // Synchronous guard against duplicate server calls (double clicks, Strict Mode effects)
  const inFlight = useRef(false);

  const runStep = useCallback(
    async (nextStage: PipelineStage, work: () => Promise<string | null>) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setStage(nextStage);
      setError(null);
      setIsRunning(true);
      let failure: string | null;
      try {
        failure = await work();
      } catch (err) {
        failure = err instanceof Error ? err.message : "Something went wrong.";
      }
      inFlight.current = false;
      setIsRunning(false);
      if (failure) setError(failure);
      return !failure;
    },
    []
  );

  const runEvaluation = useCallback(
    (force = false) =>
      runStep("evaluate", async () => {
        const result = await evaluateSession(sessionId, { force });
        if (!result.success || !result.evaluation) {
          return result.error || "Failed to analyze speech with AI.";
        }
        setEvaluation(result.evaluation as unknown as typeof initialEvaluation);
        setStage("done");
        return null;
      }),
    [runStep, sessionId]
  );

  const runOptimization = useCallback(
    () =>
      runStep("optimize", async () => {
        const result = await optimizeSessionTranscript(sessionId);
        if (result.originalText) setRawText(result.originalText);
        if (!result.success) {
          return result.error || "Vocabulary check failed.";
        }
        setCorrections(result.corrections || []);
        setStage("review");
        return null;
      }),
    [runStep, sessionId]
  );

  const runTranscription = useCallback(
    async (force = false) => {
      const ok = await runStep("transcribe", async () => {
        const result = await transcribeSession(sessionId, { force });
        if (!result.success || !result.transcript) {
          return result.error || "Failed to transcribe audio.";
        }
        setTranscript(result.transcript as typeof initialTranscript);
        setRawText(result.transcript.original_text || result.transcript.text);
        return null;
      });
      if (ok) await runOptimization();
    },
    [runStep, runOptimization, sessionId]
  );

  // Continue without AI suggestions when the vocabulary check is unavailable
  const skipOptimization = () => {
    setError(null);
    setCorrections([]);
    setStage("review");
  };

  // Persist the reviewed transcript, then evaluate it. Only ever user-triggered.
  const handleConfirmReview = async (approvedCorrections: TranscriptCorrection[]) => {
    const ok = await runStep("review", async () => {
      const result = await finalizeSessionTranscript(sessionId, approvedCorrections);
      if (!result.success) {
        return result.error || "Failed to save the reviewed transcript.";
      }
      if (result.finalizedText !== undefined) {
        setTranscript((prev) => (prev ? { ...prev, text: result.finalizedText! } : prev));
      }
      return null;
    });
    if (ok) await runEvaluation(true);
  };

  // Resume the pipeline once on mount
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !initialState.autoRun) return;
    autoStarted.current = true;
    if (initialState.stage === "transcribe") void runTranscription();
    else if (initialState.stage === "optimize") void runOptimization();
    else if (initialState.stage === "evaluate") void runEvaluation();
  }, [initialState, runTranscription, runOptimization, runEvaluation]);

  const handleDeleteSession = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this practice session? All recordings, transcripts, and evaluation metrics for this session will be permanently removed."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deletePracticeSession(sessionId);
      if (res.success) {
        router.push("/dashboard");
      } else {
        setError(res.error || "Failed to delete session.");
        setIsDeleting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session.");
      setIsDeleting(false);
    }
  };

  const stageOrder: PipelineStage[] = ["transcribe", "optimize", "review", "evaluate", "done"];
  const stageIndex = stageOrder.indexOf(stage);
  const stepState = (from: PipelineStage, to: PipelineStage): StepState => {
    if (stageIndex > stageOrder.indexOf(to)) return "done";
    if (stageIndex < stageOrder.indexOf(from)) return "pending";
    return error ? "failed" : "active";
  };

  const transcribeStep = stepState("transcribe", "transcribe");
  const vocabularyStep = stepState("optimize", "review");
  const evaluateStep = stepState("evaluate", "evaluate");

  const isTranscribing = stage === "transcribe" && isRunning;
  const isOptimizing = stage === "optimize" && isRunning;
  const isEvaluating = stage === "evaluate" && isRunning;

  const segments = Array.isArray(transcript?.segment_timestamps)
    ? (transcript.segment_timestamps as Array<{
        id: number;
        start: number;
        end: number;
        text: string;
      }>)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/sessions"
            className="p-2 -ml-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Back to sessions"
            aria-label="Back to sessions"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {prompt.categoryName || "Practice Session"}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {prompt.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href={`/practice/${prompt.id}`}>Try Again</Link>
          </Button>
          <Button asChild size="sm" className="text-xs">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSession}
            disabled={isDeleting}
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 h-9"
            title="Delete this session"
          >
            {isDeleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* 4-Stage Pipeline Status Stepper */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Analysis Pipeline
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
          <PipelineStep
            state={initialRecording ? "done" : "failed"}
            label={initialRecording ? "Audio Uploaded" : "Not uploaded"}
          />
          <PipelineStep
            state={transcribeStep}
            label={
              { pending: "Pending", active: isTranscribing ? "Whisper..." : "Transcription", done: "Transcribed ✓", failed: initialRecording ? "Transcription failed" : "No recording" }[transcribeStep]
            }
          />
          <PipelineStep
            state={vocabularyStep}
            icon={stage === "review" && !error && !isRunning ? <Sparkles size={16} className="shrink-0 animate-pulse" /> : undefined}
            label={
              {
                pending: "Vocabulary",
                active: isOptimizing ? "Checking names..." : stage === "review" && isRunning ? "Saving..." : "Awaiting your review",
                done: "Verified ✓",
                failed: stage === "optimize" ? "Check failed" : "Save failed",
              }[vocabularyStep]
            }
          />
          <PipelineStep
            state={evaluateStep}
            label={
              { pending: "Pending", active: "Analyzing...", done: "Evaluated ✓", failed: "Analysis failed" }[evaluateStep]
            }
          />
        </div>
      </div>

      {/* Error / Retry Banner */}
      {error && !isRunning && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            {stage === "transcribe" && !initialRecording && (
              <Button asChild size="sm" variant="destructive" className="shrink-0 text-xs">
                <Link href={`/practice/${prompt.id}`}>Record an Answer</Link>
              </Button>
            )}
            {stage === "transcribe" && initialRecording && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => runTranscription(true)}
                className="shrink-0 gap-1.5 text-xs"
              >
                <RotateCcw size={14} />
                Retry Transcription
              </Button>
            )}
            {stage === "optimize" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={skipOptimization}
                  className="shrink-0 text-xs"
                >
                  Review Without Suggestions
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => runOptimization()}
                  className="shrink-0 gap-1.5 text-xs"
                >
                  <RotateCcw size={14} />
                  Retry Check
                </Button>
              </>
            )}
            {stage === "evaluate" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => runEvaluation(true)}
                className="shrink-0 gap-1.5 text-xs"
              >
                <RotateCcw size={14} />
                Retry Analysis
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Review Transcript Stage */}
      {stage === "review" && (
        <TranscriptReviewCard
          originalText={rawText || transcript?.text || ""}
          initialCorrections={corrections}
          onConfirm={handleConfirmReview}
          isSubmitting={isRunning}
        />
      )}

      {/* Optimizing Loader */}
      {isOptimizing && (
        <div className="p-10 rounded-2xl bg-card border border-border text-center space-y-3">
          <Loader2 size={32} className="animate-spin mx-auto text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Checking transcript against your Personal Vocabulary...
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Matching local Sri Lankan proper nouns and names to ensure high transcription accuracy.
          </p>
        </div>
      )}

      {/* Evaluation Results Section */}
      {isEvaluating ? (
        <div className="p-12 rounded-2xl bg-card border border-border/80 text-center space-y-4">
          <Loader2 size={36} className="animate-spin mx-auto text-primary" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Evaluating your response with Gemini...
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Analyzing fluency, vocabulary, structural clarity, and identifying recurring communication patterns.
            </p>
          </div>
        </div>
      ) : evaluation ? (
        <SessionEvaluationView evaluation={evaluation} promptId={prompt.id} />
      ) : null}

      {/* Audio Playback Player */}
      {audioUrl && (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Volume2 size={14} className="text-primary" />
              Recorded Audio
            </div>
            {initialRecording?.duration_seconds && (
              <span className="text-xs text-muted-foreground font-mono">
                Duration: {Math.round(initialRecording.duration_seconds)}s
              </span>
            )}
          </div>
          <audio controls className="w-full h-11 focus:outline-none" src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Final Transcribed Text Section (the review card shows it while reviewing) */}
      {stage !== "review" && (
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-foreground">Spoken Transcript</h2>
            </div>

            {transcript && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {transcript.word_count !== null && (
                  <span className="bg-secondary px-2.5 py-1 rounded-md font-medium text-foreground">
                    {transcript.word_count} words
                  </span>
                )}
                {transcript.language && (
                  <span className="bg-secondary px-2.5 py-1 rounded-md uppercase font-medium text-foreground">
                    {transcript.language}
                  </span>
                )}
                {segments.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSegments(!showSegments)}
                    className="text-xs h-7 gap-1"
                  >
                    <Layers size={14} />
                    {showSegments ? "Hide Timestamps" : "View Timestamps"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Transcript Body */}
          {isTranscribing ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm font-medium">Transcribing your audio using Groq Whisper...</p>
              <p className="text-xs text-muted-foreground">This usually takes 1–3 seconds.</p>
            </div>
          ) : transcript ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/30 border border-border/60 text-foreground leading-relaxed text-base whitespace-pre-wrap selection:bg-primary/20">
                {transcript.text}
              </div>

              {/* Segment Breakdown if toggled */}
              {showSegments && segments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Segment Timestamps
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {segments.map((seg) => (
                      <div
                        key={seg.id}
                        className="p-2.5 rounded-md bg-muted/40 text-xs flex items-start gap-3"
                      >
                        <span className="font-mono text-muted-foreground shrink-0 bg-background/80 px-1.5 py-0.5 rounded border border-border/60">
                          {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                        </span>
                        <span className="text-foreground leading-snug">{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {!initialRecording
                ? "Nothing was recorded for this session yet."
                : error && stage === "transcribe"
                ? "Transcription could not be completed. Use 'Retry Transcription' above."
                : "No transcript available."}
            </div>
          )}
        </div>
      )}

      {/* Contextual Scenario Reference */}
      <div className="p-5 rounded-xl bg-card/60 border border-border/70 space-y-2 text-sm">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Prompt Reference
        </div>
        <p className="font-medium text-foreground">{prompt.prompt}</p>
        {prompt.context && (
          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            {prompt.context}
          </p>
        )}
      </div>
    </div>
  );
}

type StepState = "pending" | "active" | "done" | "failed";

const STEP_STYLES: Record<StepState, string> = {
  pending: "bg-muted/40 border-border text-muted-foreground",
  active: "bg-primary/10 border-primary/30 text-primary font-medium",
  done: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium",
  failed: "bg-destructive/10 border-destructive/20 text-destructive font-medium",
};

function PipelineStep({
  state,
  label,
  icon,
}: {
  state: StepState;
  label: string;
  icon?: React.ReactNode;
}) {
  const defaultIcon = {
    pending: <Clock size={16} className="shrink-0" />,
    active: <Loader2 size={16} className="animate-spin shrink-0" />,
    done: <CheckCircle2 size={16} className="shrink-0" />,
    failed: <AlertCircle size={16} className="shrink-0" />,
  }[state];

  return (
    <div
      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-colors ${STEP_STYLES[state]}`}
    >
      {(state === "active" && icon) || defaultIcon}
      <span className="truncate">{label}</span>
    </div>
  );
}
