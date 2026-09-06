import { NextResponse } from "next/dist/server/web/spec-extension/response";
import { createClient } from "@/lib/supabase/server";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomScore(base: number, variance: number) {
  const score = base + (Math.random() * variance * 2 - variance);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if we already have a lot of data to avoid overwhelming the db
    const { count } = await supabase.from('practice_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if ((count || 0) > 100) {
      return NextResponse.json({ message: "Already seeded. Clear data first if you want to re-seed." });
    }

    const { data: categories } = await supabase.from('practice_categories').select('id');
    const categoryId = categories?.[0]?.id || null;

    const sessionsToInsert = [];
    const recordingsToInsert = [];
    const evaluationsToInsert = [];
    
    const now = new Date();
    
    // Generate ~40 sessions over the last 60 days
    // Upward trend: start with base score 55, end with base score 75
    for (let i = 0; i < 40; i++) {
      // Pick a random day in the past 60 days
      const daysAgo = randomInt(0, 60);
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() - daysAgo);
      
      const sessionId = crypto.randomUUID();
      const recordingId = crypto.randomUUID();
      
      // Calculate a base score that improves over time (daysAgo = 60 means worse score)
      // day 60 = 55, day 0 = 75
      const progressFactor = (60 - daysAgo) / 60; // 0 to 1
      const baseScore = 55 + (progressFactor * 20);
      
      const overallScore = randomScore(baseScore, 10);
      const durationSeconds = randomInt(45, 120);

      sessionsToInsert.push({
        id: sessionId,
        user_id: user.id,
        category_id: categoryId,
        mode: 'practice',
        status: 'completed',
        started_at: sessionDate.toISOString(),
        completed_at: sessionDate.toISOString(),
        created_at: sessionDate.toISOString()
      });

      recordingsToInsert.push({
        id: recordingId,
        session_id: sessionId,
        user_id: user.id,
        storage_path: `fake-path/${recordingId}.webm`,
        duration_seconds: durationSeconds,
        transcription_status: 'completed',
        created_at: sessionDate.toISOString()
      });

      evaluationsToInsert.push({
        session_id: sessionId,
        user_id: user.id,
        overall_score: overallScore,
        fluency_score: randomScore(baseScore, 12),
        grammar_score: randomScore(baseScore, 10),
        vocabulary_score: randomScore(baseScore, 8),
        clarity_score: randomScore(baseScore, 10),
        professionalism_score: randomScore(baseScore, 15),
        structure_score: randomScore(baseScore, 12),
        filler_control_score: randomScore(baseScore - 5, 15), // Usually harder
        pace_wpm: randomInt(110, 160),
        analysis_json: {
            strengths: ["Clear pronunciation", "Good volume"],
            weaknesses: ["Some filler words", "Hesitation"],
            recurring_mistakes: daysAgo > 30 ? [{ type: 'grammar', description: 'Subject-verb agreement' }] : []
        },
        model_provider: 'google',
        model_name: 'gemini-3.6-flash',
        created_at: sessionDate.toISOString()
      });
    }

    // Insert everything
    const { error: sessErr } = await supabase.from('practice_sessions').insert(sessionsToInsert);
    if (sessErr) throw sessErr;
    
    const { error: recErr } = await supabase.from('recordings').insert(recordingsToInsert);
    if (recErr) throw recErr;
    
    const { error: evalErr } = await supabase.from('evaluations').insert(evaluationsToInsert);
    if (evalErr) throw evalErr;

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${sessionsToInsert.length} sessions, recordings, and evaluations.` 
    });

  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
