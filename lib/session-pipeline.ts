/**
 * Session page pipeline: transcribe -> optimize (vocabulary check) -> review -> evaluate -> done.
 * The initial stage is derived from persisted state so a reload resumes where the session left off.
 */
export type PipelineStage = "transcribe" | "optimize" | "review" | "evaluate" | "done";

export interface PipelineSnapshot {
  sessionStatus: string;
  hasRecording: boolean;
  transcriptionStatus: string | null;
  hasTranscript: boolean;
  hasEvaluation: boolean;
}

export interface InitialPipelineState {
  stage: PipelineStage;
  /** Whether the stage's work should start automatically on page load. */
  autoRun: boolean;
  error: string | null;
}

export function deriveInitialPipelineState(snapshot: PipelineSnapshot): InitialPipelineState {
  if (snapshot.hasEvaluation) {
    return { stage: "done", autoRun: false, error: null };
  }

  if (!snapshot.hasTranscript) {
    if (!snapshot.hasRecording) {
      return {
        stage: "transcribe",
        autoRun: false,
        error: "No recording was uploaded for this session.",
      };
    }
    if (snapshot.transcriptionStatus === "failed") {
      return {
        stage: "transcribe",
        autoRun: false,
        error: "Transcription failed. Your recording is saved, so you can retry.",
      };
    }
    return { stage: "transcribe", autoRun: true, error: null };
  }

  switch (snapshot.sessionStatus) {
    case "reviewing":
      return { stage: "review", autoRun: false, error: null };
    case "analyzing":
    case "completed":
      return { stage: "evaluate", autoRun: true, error: null };
    case "failed":
      // A transcript exists, so the failure happened during evaluation.
      return {
        stage: "evaluate",
        autoRun: false,
        error: "The last analysis attempt failed. Your transcript is saved, so you can retry.",
      };
    default:
      // uploaded / transcribing / transcribed / optimizing (e.g. interrupted mid-check)
      return { stage: "optimize", autoRun: true, error: null };
  }
}
