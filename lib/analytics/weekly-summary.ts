import { createClient } from "../supabase/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { getServerEnv } from "@/lib/env";
import { z } from "zod";

export const weeklySummarySchema = z.object({
  title: z.string().describe("A short, encouraging title for the week"),
  overview: z.string().describe("A paragraph summarizing their progress and effort"),
  strengths: z.array(z.string()).describe("1-3 things they did well this week"),
  focus_areas: z.array(z.string()).describe("1-3 things they should focus on next week"),
  encouragement: z.string().describe("A closing sentence to motivate them"),
});

export type WeeklySummaryJson = z.infer<typeof weeklySummarySchema>;

export async function generateWeeklySummary(supabase: any, userId: string, periodEnd: Date) {
  // Calculate periods
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 7);
  
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);

  // 1. Fetch current week stats
  const { data: currentSessions } = await supabase
    .from('practice_sessions')
    .select(`
      id,
      recordings(duration_seconds),
      evaluations(overall_score, analysis_json)
    `)
    .eq('user_id', userId)
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString());

  // 2. Fetch previous week stats for comparison
  const { data: prevSessions } = await supabase
    .from('practice_sessions')
    .select('evaluations(overall_score)')
    .eq('user_id', userId)
    .gte('created_at', previousPeriodStart.toISOString())
    .lt('created_at', periodStart.toISOString());

  // Compute metrics
  const session_count = currentSessions?.length || 0;
  
  let speaking_minutes = 0;
  let currentScoreSum = 0;
  let currentScoreCount = 0;
  
  const mistakeFrequencies: Record<string, number> = {};

  currentSessions?.forEach((session: any) => {
    // Minutes
    const recs = Array.isArray(session.recordings) ? session.recordings : (session.recordings ? [session.recordings] : []);
    recs.forEach((rec: any) => {
      speaking_minutes += (Number(rec.duration_seconds) || 0) / 60;
    });

    // Score
    const evals = Array.isArray(session.evaluations) ? session.evaluations : (session.evaluations ? [session.evaluations] : []);
    evals.forEach((ev: any) => {
      if (ev.overall_score) {
        currentScoreSum += Number(ev.overall_score);
        currentScoreCount++;
      }
      // Gather some context for the AI
      if (ev.analysis_json?.recurring_mistakes) {
        ev.analysis_json.recurring_mistakes.forEach((m: any) => {
          mistakeFrequencies[m.type] = (mistakeFrequencies[m.type] || 0) + 1;
        });
      }
    });
  });

  const average_score = currentScoreCount > 0 ? currentScoreSum / currentScoreCount : 0;

  let prevScoreSum = 0;
  let prevScoreCount = 0;
  prevSessions?.forEach((session: any) => {
    const evals = Array.isArray(session.evaluations) ? session.evaluations : (session.evaluations ? [session.evaluations] : []);
    evals.forEach((ev: any) => {
      if (ev.overall_score) {
        prevScoreSum += Number(ev.overall_score);
        prevScoreCount++;
      }
    });
  });

  const previous_average_score = prevScoreCount > 0 ? prevScoreSum / prevScoreCount : 0;
  const score_delta = average_score > 0 && previous_average_score > 0 ? average_score - previous_average_score : 0;

  // If no sessions, we might just return or generate a "take a break" summary
  
  // 3. Generate narrative with Gemini
  const env = getServerEnv();
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  const modelStr = env.GEMINI_MODEL || "gemini-3.6-flash";
  
  const prompt = `
    You are Vocaura, a Professional English Trainer.
    Analyze the user's performance this week and generate a supportive summary.
    
    Data:
    - Sessions completed: ${session_count}
    - Speaking minutes: ${speaking_minutes.toFixed(1)}
    - Average Score: ${average_score.toFixed(1)} / 100
    - Score Change from Last Week: ${score_delta > 0 ? '+' : ''}${score_delta.toFixed(1)}
    - Frequent mistakes (type: count): ${JSON.stringify(mistakeFrequencies)}
    
    Do not invent or hallucinate metrics. Use only the provided data to craft the narrative.
    The tone should be calm, professional, and encouraging.
  `;

  const { object: summary_json } = await generateObject({
    model: google(modelStr),
    system: "You are an AI data interpreter that outputs strictly structured JSON summaries.",
    prompt,
    schema: weeklySummarySchema,
  });

  // 4. Save to database
  const { data: savedSummary, error } = await supabase
    .from('weekly_summaries')
    .upsert({
      user_id: userId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      session_count,
      speaking_minutes: Number(speaking_minutes.toFixed(2)),
      average_score: average_score > 0 ? Number(average_score.toFixed(2)) : null,
      previous_average_score: previous_average_score > 0 ? Number(previous_average_score.toFixed(2)) : null,
      score_delta: score_delta !== 0 ? Number(score_delta.toFixed(2)) : null,
      summary_json
    }, { onConflict: 'user_id, period_start, period_end' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return savedSummary;
}
