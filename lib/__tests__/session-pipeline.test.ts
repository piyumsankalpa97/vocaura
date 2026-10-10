import { describe, it, expect } from "vitest";
import { deriveInitialPipelineState, PipelineSnapshot } from "../session-pipeline";

const base: PipelineSnapshot = {
  sessionStatus: "uploaded",
  hasRecording: true,
  transcriptionStatus: "pending",
  hasTranscript: false,
  hasEvaluation: false,
};

describe("deriveInitialPipelineState", () => {
  it("auto-starts transcription for a freshly uploaded recording", () => {
    expect(deriveInitialPipelineState(base)).toEqual({
      stage: "transcribe",
      autoRun: true,
      error: null,
    });
  });

  it("does not auto-retry a failed transcription", () => {
    const state = deriveInitialPipelineState({
      ...base,
      sessionStatus: "failed",
      transcriptionStatus: "failed",
    });
    expect(state.stage).toBe("transcribe");
    expect(state.autoRun).toBe(false);
    expect(state.error).toMatch(/Transcription failed/);
  });

  it("reports a missing recording instead of trying to transcribe", () => {
    const state = deriveInitialPipelineState({ ...base, hasRecording: false });
    expect(state.autoRun).toBe(false);
    expect(state.error).toMatch(/No recording/);
  });

  it.each(["transcribed", "optimizing", "uploaded"])(
    "resumes the vocabulary check when status is %s",
    (sessionStatus) => {
      const state = deriveInitialPipelineState({
        ...base,
        sessionStatus,
        hasTranscript: true,
      });
      expect(state).toEqual({ stage: "optimize", autoRun: true, error: null });
    }
  );

  it("returns to the review card when the user had not confirmed yet", () => {
    const state = deriveInitialPipelineState({
      ...base,
      sessionStatus: "reviewing",
      hasTranscript: true,
    });
    expect(state).toEqual({ stage: "review", autoRun: false, error: null });
  });

  it("resumes evaluation after review was confirmed, without showing review again", () => {
    const state = deriveInitialPipelineState({
      ...base,
      sessionStatus: "analyzing",
      hasTranscript: true,
    });
    expect(state).toEqual({ stage: "evaluate", autoRun: true, error: null });
  });

  it("shows a retryable evaluation error instead of looping", () => {
    const state = deriveInitialPipelineState({
      ...base,
      sessionStatus: "failed",
      transcriptionStatus: "completed",
      hasTranscript: true,
    });
    expect(state.stage).toBe("evaluate");
    expect(state.autoRun).toBe(false);
    expect(state.error).toMatch(/analysis attempt failed/);
  });

  it("is done when an evaluation exists regardless of status", () => {
    const state = deriveInitialPipelineState({
      ...base,
      sessionStatus: "failed",
      hasTranscript: true,
      hasEvaluation: true,
    });
    expect(state).toEqual({ stage: "done", autoRun: false, error: null });
  });
});
