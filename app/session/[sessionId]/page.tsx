import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { SessionTranscriptionView } from "./session-transcription-view";

interface SessionPageProps {
  params: { sessionId: string } | Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const sessionId = resolvedParams.sessionId;

  // 1. Fetch practice session
  const { data: session } = await supabase
    .from("practice_sessions")
    .select("*, practice_prompts(*, practice_categories(name))")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

  // 2. Fetch latest recording
  const { data: recording } = await supabase
    .from("recordings")
    .select("id, storage_path, duration_seconds, transcription_status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Generate signed audio URL if recording exists
  let audioUrl: string | null = null;
  if (recording?.storage_path) {
    const { data: signedData } = await supabase.storage
      .from("recordings")
      .createSignedUrl(recording.storage_path, 3600);
    audioUrl = signedData?.signedUrl || null;
  }

  // 4. Fetch transcript if exists
  let transcript = null;
  if (recording) {
    const { data: transcriptData } = await supabase
      .from("transcripts")
      .select("id, text, language, word_count, segment_timestamps")
      .eq("recording_id", recording.id)
      .eq("user_id", user.id)
      .maybeSingle();

    transcript = transcriptData;
  }

  // 5. Fetch evaluation if exists
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  const prompt = session.practice_prompts;

  return (
    <div className="p-6 pb-24 min-h-screen">
      <SessionTranscriptionView
        sessionId={sessionId}
        sessionStatus={session.status}
        prompt={{
          id: prompt?.id || "",
          title: prompt?.title || "Practice Session",
          prompt: prompt?.prompt || "",
          context: prompt?.context || null,
          categoryName: prompt?.practice_categories?.name,
        }}
        initialRecording={recording}
        initialTranscript={transcript}
        initialEvaluation={evaluation}
        audioUrl={audioUrl}
      />
    </div>
  );
}
