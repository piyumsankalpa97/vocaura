"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { transcribeSession } from "@/app/actions/transcribe";
import { evaluateSession, EvaluateSessionResult } from "@/app/actions/evaluate";
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
} from "lucide-react";
import Link from "next/link";
import { SessionEvaluationView } from "./session-evaluation-view";
import { EvaluationResult } from "@/lib/ai/evaluation-schema";

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
    language: string | null;
    word_count: number | null;
    segment_timestamps: unknown;
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
  const [transcript, setTranscript] = useState(initialTranscript);
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, startTranscriptionTransition] = useTransition();
  const [isEvaluating, startEvaluationTransition] = useTransition();
  const [showSegments, setShowSegments] = useState(false);

  const isTranscriptionDone = Boolean(transcript?.text);
  const isEvaluationDone = Boolean(evaluation?.overall_score !== undefined);
  const isTranscriptionFailed =
    initialRecording?.transcription_status === "failed" && !transcript;
  const isEvaluationFailed = sessionStatus === "failed" && !evaluation && isTranscriptionDone;

  const runEvaluation = useCallback((force = false) => {
    setError(null);
    startEvaluationTransition(async () => {
      try {
        const result = await evaluateSession(sessionId, { force });
        if (result.success && result.evaluation) {
          setEvaluation(result.evaluation as unknown as typeof initialEvaluation);
        } else {
          setError(result.error || "Failed to analyze speech with AI.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Evaluation failed.");
      }
    });
  }, [sessionId, initialEvaluation]);

  const runTranscription = useCallback((force = false) => {
    setError(null);
    startTranscriptionTransition(async () => {
      try {
        const result = await transcribeSession(sessionId, { force });
        if (result.success && result.transcript) {
          setTranscript(result.transcript as typeof initialTranscript);
          // Automatically trigger evaluation upon successful transcription
          runEvaluation(force);
        } else {
          setError(result.error || "Failed to transcribe audio.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed.");
      }
    });
  }, [sessionId, initialTranscript, runEvaluation]);

  useEffect(() => {
    // 1. If recording exists but no transcript yet and not failed, trigger transcription
    if (!initialTranscript && initialRecording && initialRecording.transcription_status !== "failed") {
      runTranscription();
    }
    // 2. If transcript already exists but evaluation not yet completed and not marked failed, trigger evaluation
    else if (initialTranscript && !initialEvaluation && sessionStatus !== "failed") {
      runEvaluation();
    }
  }, [initialTranscript, initialRecording, initialEvaluation, sessionStatus, runTranscription, runEvaluation]);

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
            href={`/practice/${prompt.id}`}
            className="p-2 -ml-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
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
        </div>
      </div>

      {/* Pipeline Status Stepper */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Analysis Pipeline
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {/* Stage 1: Upload */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="font-medium text-xs">Audio Uploaded</span>
          </div>

          {/* Stage 2: Transcription */}
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
              isTranscribing
                ? "bg-primary/10 border-primary/30 text-primary font-medium"
                : isTranscriptionDone
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium"
                : isTranscriptionFailed
                ? "bg-destructive/10 border-destructive/20 text-destructive font-medium"
                : "bg-muted/40 border-border text-muted-foreground"
            }`}
          >
            {isTranscribing ? (
              <Loader2 size={18} className="animate-spin shrink-0 text-primary" />
            ) : isTranscriptionDone ? (
              <CheckCircle2 size={18} className="shrink-0" />
            ) : isTranscriptionFailed ? (
              <AlertCircle size={18} className="shrink-0" />
            ) : (
              <Clock size={18} className="shrink-0 text-muted-foreground" />
            )}
            <span>
              {isTranscribing
                ? "Transcribing with Whisper..."
                : isTranscriptionDone
                ? "Transcribed ✓"
                : isTranscriptionFailed
                ? "Transcription Failed"
                : "Pending Transcription"}
            </span>
          </div>

          {/* Stage 3: Evaluation */}
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
              isEvaluating
                ? "bg-primary/10 border-primary/30 text-primary font-medium"
                : isEvaluationDone
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium"
                : isEvaluationFailed
                ? "bg-destructive/10 border-destructive/20 text-destructive font-medium"
                : "bg-muted/40 border-border text-muted-foreground"
            }`}
          >
            {isEvaluating ? (
              <Loader2 size={18} className="animate-spin shrink-0 text-primary" />
            ) : isEvaluationDone ? (
              <CheckCircle2 size={18} className="shrink-0" />
            ) : isEvaluationFailed ? (
              <AlertCircle size={18} className="shrink-0" />
            ) : (
              <Sparkles size={18} className="shrink-0 text-muted-foreground" />
            )}
            <span>
              {isEvaluating
                ? "Analyzing with Gemini..."
                : isEvaluationDone
                ? "Evaluation Complete ✓"
                : isEvaluationFailed
                ? "Evaluation Failed"
                : "Pending Evaluation"}
            </span>
          </div>
        </div>
      </div>

      {/* Error / Retry Banner */}
      {(error || ((isTranscriptionFailed || isEvaluationFailed) && !isTranscribing && !isEvaluating)) && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertCircle size={18} className="shrink-0" />
            <span>
              {error ||
                (isEvaluationFailed
                  ? "Failed to generate evaluation with Gemini."
                  : "An error occurred during audio processing.")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isTranscriptionDone && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => runTranscription(true)}
                disabled={isTranscribing}
                className="shrink-0 gap-1.5 text-xs"
              >
                {isTranscribing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Retry Transcription
              </Button>
            )}
            {isTranscriptionDone && !isEvaluationDone && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => runEvaluation(true)}
                disabled={isEvaluating}
                className="shrink-0 gap-1.5 text-xs"
              >
                {isEvaluating ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Retry Analysis
              </Button>
            )}
          </div>
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

      {/* Transcribed Text Section */}
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
            {isTranscriptionFailed
              ? "Transcription could not be completed. Click 'Retry Transcription' above."
              : "No transcript available."}
          </div>
        )}
      </div>

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
