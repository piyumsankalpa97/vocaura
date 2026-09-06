const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '..', '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [k, ...v] = trimmed.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const supabase = createClient(url, secretKey);

const TARGET_USER_ID = process.argv[2] || 'f9950033-d2f4-4704-893b-e5b0f624a14f';

async function run() {
  console.log('Generating weekly summary for user:', TARGET_USER_ID);
  
  // Calculate periods
  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - 7);
  
  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - 7);

  // Fetch current sessions
  const { data: currentSessions, error: currErr } = await supabase
    .from('practice_sessions')
    .select(`
      id,
      recordings(duration_seconds),
      evaluations(overall_score, analysis_json)
    `)
    .eq('user_id', TARGET_USER_ID)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', today.toISOString());

  if (currErr) throw currErr;

  // Fetch previous sessions
  const { data: prevSessions, error: prevErr } = await supabase
    .from('practice_sessions')
    .select('evaluations(overall_score)')
    .eq('user_id', TARGET_USER_ID)
    .gte('created_at', prevPeriodStart.toISOString())
    .lt('created_at', periodStart.toISOString());

  if (prevErr) throw prevErr;

  const session_count = currentSessions?.length || 0;
  let speaking_minutes = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  currentSessions?.forEach(s => {
    const recs = Array.isArray(s.recordings) ? s.recordings : (s.recordings ? [s.recordings] : []);
    recs.forEach(r => { speaking_minutes += (Number(r.duration_seconds) || 0) / 60; });

    const evals = Array.isArray(s.evaluations) ? s.evaluations : (s.evaluations ? [s.evaluations] : []);
    evals.forEach(e => {
      if (e.overall_score) {
        scoreSum += Number(e.overall_score);
        scoreCount++;
      }
    });
  });

  const average_score = scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(2)) : null;

  let prevScoreSum = 0;
  let prevScoreCount = 0;
  prevSessions?.forEach(s => {
    const evals = Array.isArray(s.evaluations) ? s.evaluations : (s.evaluations ? [s.evaluations] : []);
    evals.forEach(e => {
      if (e.overall_score) {
        prevScoreSum += Number(e.overall_score);
        prevScoreCount++;
      }
    });
  });

  const previous_average_score = prevScoreCount > 0 ? Number((prevScoreSum / prevScoreCount).toFixed(2)) : null;
  const score_delta = average_score && previous_average_score ? Number((average_score - previous_average_score).toFixed(2)) : null;

  const summary_json = {
    title: "Strong Momentum & Steadiness",
    overview: `You completed ${session_count} speaking sessions this week across ${speaking_minutes.toFixed(1)} minutes of practice, maintaining a solid average score of ${average_score}/100.`,
    strengths: [
      "Consistent pace and clarity in software engineering standups",
      "Noticeable reduction in filler words compared to last month"
    ],
    focus_areas: [
      "Refining concise technical transitions",
      "Preposition precision when detailing architecture"
    ],
    encouragement: "Great consistency this week—your deliberate practice is clearly showing in your fluency and control!"
  };

  const { data: saved, error: saveErr } = await supabase
    .from('weekly_summaries')
    .upsert({
      user_id: TARGET_USER_ID,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: today.toISOString().split('T')[0],
      session_count,
      speaking_minutes: Number(speaking_minutes.toFixed(2)),
      average_score,
      previous_average_score,
      score_delta,
      summary_json
    }, { onConflict: 'user_id, period_start, period_end' })
    .select()
    .single();

  if (saveErr) throw saveErr;

  console.log('✅ Weekly summary generated and saved successfully:');
  console.log(saved);
}

run().catch(err => {
  console.error('Error generating summary:', err);
  process.exit(1);
});
