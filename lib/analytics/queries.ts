import { createClient } from "../supabase/server";

export type Period = '7d' | '30d' | '90d' | 'all-time';

function getStartDate(period: Period): Date | null {
  if (period === 'all-time') return null;
  const days = parseInt(period.replace('d', ''), 10);
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function getOverallScoreTrend(period: Period) {
  const supabase = await createClient();
  const startDate = getStartDate(period);

  let query = supabase
    .from('evaluations')
    .select('created_at, overall_score')
    .order('created_at', { ascending: true });

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => ({
    date: new Date(row.created_at).toLocaleDateString(),
    score: row.overall_score
  }));
}

export async function getCategoryComparison(period: Period) {
  const supabase = await createClient();
  const startDate = getStartDate(period);

  let query = supabase
    .from('evaluations')
    .select('fluency_score, grammar_score, vocabulary_score, clarity_score, professionalism_score, structure_score, filler_control_score, created_at');

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  if (!data || data.length === 0) {
    return [
      { category: 'Fluency', score: 0 },
      { category: 'Grammar', score: 0 },
      { category: 'Vocabulary', score: 0 },
      { category: 'Clarity', score: 0 },
      { category: 'Professionalism', score: 0 },
      { category: 'Structure', score: 0 },
      { category: 'Filler Control', score: 0 },
    ];
  }

  const sums = data.reduce((acc, row) => {
    acc.fluency += Number(row.fluency_score) || 0;
    acc.grammar += Number(row.grammar_score) || 0;
    acc.vocabulary += Number(row.vocabulary_score) || 0;
    acc.clarity += Number(row.clarity_score) || 0;
    acc.professionalism += Number(row.professionalism_score) || 0;
    acc.structure += Number(row.structure_score) || 0;
    acc.fillerControl += Number(row.filler_control_score) || 0;
    return acc;
  }, {
    fluency: 0, grammar: 0, vocabulary: 0, clarity: 0, professionalism: 0, structure: 0, fillerControl: 0
  });

  const count = data.length;
  
  return [
    { category: 'Fluency', score: Math.round(sums.fluency / count) },
    { category: 'Grammar', score: Math.round(sums.grammar / count) },
    { category: 'Vocabulary', score: Math.round(sums.vocabulary / count) },
    { category: 'Clarity', score: Math.round(sums.clarity / count) },
    { category: 'Professionalism', score: Math.round(sums.professionalism / count) },
    { category: 'Structure', score: Math.round(sums.structure / count) },
    { category: 'Filler Control', score: Math.round(sums.fillerControl / count) },
  ];
}

export async function getActivityVolume(period: Period) {
  const supabase = await createClient();
  const startDate = getStartDate(period);

  let query = supabase
    .from('practice_sessions')
    .select(`
      created_at,
      recordings(duration_seconds)
    `)
    .order('created_at', { ascending: true });

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group by date (day)
  const grouped: Record<string, { sessions: number, minutes: number }> = {};
  
  data?.forEach(row => {
    const dateStr = new Date(row.created_at).toLocaleDateString();
    if (!grouped[dateStr]) {
      grouped[dateStr] = { sessions: 0, minutes: 0 };
    }
    grouped[dateStr].sessions += 1;
    
    // sum up durations from recordings related to this session
    const recordings = Array.isArray(row.recordings) ? row.recordings : (row.recordings ? [row.recordings] : []);
    const totalSeconds = recordings.reduce((acc, rec: any) => acc + (Number(rec.duration_seconds) || 0), 0);
    
    grouped[dateStr].minutes += totalSeconds / 60;
  });

  return Object.entries(grouped).map(([date, stats]) => ({
    date,
    sessions: stats.sessions,
    minutes: Number(stats.minutes.toFixed(2))
  }));
}
