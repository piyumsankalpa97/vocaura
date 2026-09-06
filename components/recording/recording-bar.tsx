"use client";

import { useState } from "react";
import { Mic, Pause, Play, Square, UploadCloud, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createPracticeSession, saveRecordingMetadata } from "@/app/actions/recording";
import { useRouter } from "next/navigation";

interface RecordingBarProps {
  promptId: string;
  categoryId?: string | null;
}

export function RecordingBar({ promptId, categoryId }: RecordingBarProps) {
  const recorder = useAudioRecorder();
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const isBrowser = typeof window !== "undefined";
  const isSupported = isBrowser ? !!window.MediaRecorder : true; // default true for SSR so we don't flash error

  const handleStart = async () => {
    if (!sessionId) {
      try {
        const newSessionId = await createPracticeSession(promptId, categoryId);
        setSessionId(newSessionId);
      } catch (err) {
        console.error("Failed to create session", err);
        return;
      }
    }
    await recorder.start();
  };

  const handleSubmit = async () => {
    if (!recorder.audioBlob || !sessionId) return;
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = recorder.audioBlob.type.includes("webm") ? "webm" : "mp4";
      const fileName = `${user.id}/${sessionId}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("recordings")
        .upload(fileName, recorder.audioBlob, {
          contentType: recorder.audioBlob.type,
          upsert: false,
        });

      if (error) throw error;

      await saveRecordingMetadata(
        sessionId,
        data.path,
        recorder.duration,
        recorder.audioBlob.size,
        recorder.audioBlob.type
      );

      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error("Upload failed", err);
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isSupported) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center z-50">
        <div className="max-w-3xl w-full text-center text-sm text-red-500 font-medium p-2">
          Your browser does not support audio recording. Please try a modern version of Chrome, Firefox, or Safari.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center z-50">
      <div className="max-w-3xl w-full flex items-center justify-between gap-4">
        
        {/* Status / Volume Indicator */}
        <div className="flex items-center gap-3 flex-1" aria-live="polite">
          {(recorder.status === "recording" || recorder.status === "paused") && (
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${recorder.status === "recording" ? "bg-red-500 animate-pulse" : "bg-yellow-500"}`} 
              />
              <span className="text-sm font-mono font-medium">{formatTime(recorder.duration)}</span>
            </div>
          )}
          
          {recorder.status === "recording" && (
            <div className="flex items-end gap-[2px] h-6 flex-1 max-w-[80px]">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-primary/80 rounded-t-sm transition-all duration-75"
                  style={{ 
                    height: `${Math.max(15, (recorder.volumeLevel / 100) * (Math.random() * 40 + 60))}%`,
                    opacity: i * 10 < recorder.volumeLevel ? 1 : 0.3
                  }}
                />
              ))}
            </div>
          )}

          {recorder.status === "idle" && !recorder.audioBlob && (
            <span className="text-sm text-muted-foreground font-medium">Ready to record</span>
          )}

          {recorder.status === "stopped" && recorder.audioBlob && (
            <span className="text-sm text-green-600 font-medium">Recording saved ({formatTime(recorder.duration)})</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {recorder.status === "idle" && !recorder.audioBlob && (
            <Button onClick={handleStart} className="rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md">
              <Mic className="mr-2" size={16} /> Start Recording
            </Button>
          )}

          {recorder.status === "recording" && (
            <>
              <Button onClick={recorder.pause} variant="secondary" size="icon" className="rounded-full" aria-label="Pause Recording">
                <Pause size={18} />
              </Button>
              <Button onClick={recorder.stop} variant="destructive" className="rounded-full shadow-md">
                <Square className="mr-2" size={16} /> Stop
              </Button>
            </>
          )}

          {recorder.status === "paused" && (
            <>
              <Button onClick={recorder.resume} variant="secondary" size="icon" className="rounded-full" aria-label="Resume Recording">
                <Play size={18} />
              </Button>
              <Button onClick={recorder.stop} variant="destructive" className="rounded-full shadow-md">
                <Square className="mr-2" size={16} /> Stop
              </Button>
            </>
          )}

          {recorder.status === "stopped" && recorder.audioBlob && (
            <>
              <Button onClick={recorder.reset} variant="outline" className="rounded-full">
                Retry
              </Button>
              <Button onClick={handleSubmit} disabled={isUploading} className="rounded-full shadow-md">
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2" size={16} />
                )}
                Submit for Analysis
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}