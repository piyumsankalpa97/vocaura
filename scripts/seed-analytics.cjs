const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

if (!url || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(url, secretKey);

const TARGET_USER_ID = process.argv[2] || 'f9950033-d2f4-4704-893b-e5b0f624a14f';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

async function seed() {
  console.log(`Starting seed analytics for user: ${TARGET_USER_ID}`);

  // 1. Verify user exists
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', TARGET_USER_ID)
    .single();

  if (profileErr || !profile) {
    console.error('Target user not found:', profileErr?.message || 'Unknown profile');
    process.exit(1);
  }

  console.log(`Found profile: ${profile.display_name} (${profile.role})`);

  // 2. Fetch relevant prompts
  const { data: prompts, error: promptErr } = await supabase
    .from('practice_prompts')
    .select('id, category_id, title, expected_skills');

  if (promptErr || !prompts || prompts.length === 0) {
    console.error('Failed to fetch prompts:', promptErr?.message);
    process.exit(1);
  }

  // Filter prompts suitable for software engineering & workplace
  const sePrompts = prompts.filter(p => p.title.toLowerCase().includes('standup') || 
                                       p.title.toLowerCase().includes('debt') || 
                                       p.title.toLowerCase().includes('architecture') || 
                                       p.title.toLowerCase().includes('code review') || 
                                       p.title.toLowerCase().includes('outage') ||
                                       p.category_id === 'c94c0308-5d48-402a-8910-f2971cc19746');
  const availablePrompts = sePrompts.length > 0 ? sePrompts : prompts;

  console.log(`Using ${availablePrompts.length} relevant prompts.`);

  // 3. Generate 45 sessions over 60 days
  // Distribution: ~4-5 sessions per week, with scores progressing from ~55 to ~82
  const now = new Date();
  const sessionsToInsert = [];
  const recordingsToInsert = [];
  const transcriptsToInsert = [];
  const evaluationsToInsert = [];

  const totalSessions = 48;

  // Distribute over days: 0 to 58 days ago
  // Sort ascending in time
  const dayOffsets = [];
  for (let i = 0; i < totalSessions; i++) {
    // Generate dates clustering into practice days
    const day = Math.floor((58 * (totalSessions - 1 - i)) / totalSessions);
    // Add small jitter
    dayOffsets.push(clamp(day + randomInt(-1, 1), 0, 59));
  }
  dayOffsets.sort((a, b) => b - a); // descending days ago = ascending chronologically

  for (let i = 0; i < totalSessions; i++) {
    const daysAgo = dayOffsets[i];
    const sessionDate = new Date(now);
    sessionDate.setDate(now.getDate() - daysAgo);
    // Random hour between 9am and 8pm
    sessionDate.setHours(randomInt(9, 20), randomInt(0, 59), randomInt(0, 59), 0);

    const sessionId = crypto.randomUUID();
    const recordingId = crypto.randomUUID();
    const transcriptId = crypto.randomUUID();
    const evaluationId = crypto.randomUUID();

    const prompt = availablePrompts[i % availablePrompts.length];

    // Progression curve:
    // progress factor from 0.0 (day 60) to 1.0 (now)
    const progressFactor = (60 - daysAgo) / 60;
    
    // Base score progresses from 52 to 81 with natural variance (+/- 4)
    const baseScore = Math.round(52 + (progressFactor * 29) + randomInt(-3, 4));
    const overallScore = clamp(baseScore, 48, 92);

    // Sub-scores
    const fluency = clamp(baseScore + randomInt(-4, 4), 45, 95);
    const grammar = clamp(baseScore + randomInt(-3, 3), 45, 95);
    const vocabulary = clamp(baseScore + randomInt(-2, 5), 45, 95);
    const clarity = clamp(baseScore + randomInt(-3, 4), 45, 95);
    const professionalism = clamp(baseScore + randomInt(-2, 6), 50, 95);
    const structure = clamp(baseScore + randomInt(-4, 3), 45, 95);
    // Filler control starts lower, improves notably
    const fillerControl = clamp(Math.round(45 + (progressFactor * 35) + randomInt(-3, 3)), 40, 95);

    const paceWpm = clamp(Math.round(118 + (progressFactor * 16) + randomInt(-6, 8)), 105, 155);
    const durationSeconds = randomInt(50, 130);
    const wordCount = Math.round((paceWpm / 60) * durationSeconds);

    const completedAt = new Date(sessionDate.getTime() + (durationSeconds + 15) * 1000);

    // 1. Practice session
    sessionsToInsert.push({
      id: sessionId,
      user_id: TARGET_USER_ID,
      prompt_id: prompt.id,
      category_id: prompt.category_id,
      mode: 'practice',
      status: 'completed',
      started_at: sessionDate.toISOString(),
      completed_at: completedAt.toISOString(),
      created_at: sessionDate.toISOString(),
    });

    // 2. Recording
    recordingsToInsert.push({
      id: recordingId,
      session_id: sessionId,
      user_id: TARGET_USER_ID,
      storage_path: `${TARGET_USER_ID}/${sessionId}-${sessionDate.getTime()}.webm`,
      mime_type: 'audio/webm;codecs=opus',
      duration_seconds: durationSeconds,
      file_size_bytes: durationSeconds * 16250,
      provider: 'groq',
      provider_model: 'whisper-large-v3',
      transcription_status: 'completed',
      created_at: sessionDate.toISOString(),
    });

    // 3. Transcript
    transcriptsToInsert.push({
      id: transcriptId,
      recording_id: recordingId,
      user_id: TARGET_USER_ID,
      text: `In this practice session on ${prompt.title}, I walked through the key requirements and discussed technical tradeoffs. We ensured clear structure and accurate terminology.`,
      language: 'en',
      word_count: wordCount,
      created_at: sessionDate.toISOString(),
    });

    // 4. Evaluation
    const fillerCount = Math.max(1, Math.round(14 - (progressFactor * 10) + randomInt(-1, 2)));
    evaluationsToInsert.push({
      id: evaluationId,
      session_id: sessionId,
      user_id: TARGET_USER_ID,
      overall_score: overallScore,
      fluency_score: fluency,
      grammar_score: grammar,
      vocabulary_score: vocabulary,
      clarity_score: clarity,
      professionalism_score: professionalism,
      structure_score: structure,
      filler_control_score: fillerControl,
      pace_wpm: paceWpm,
      analysis_json: {
        summary: `Strong presentation addressing ${prompt.title} with solid technical vocabulary and steady delivery.`,
        scores: {
          fluency,
          grammar,
          vocabulary,
          clarity,
          professionalism,
          structure,
          filler_control: fillerControl,
        },
        objective_metrics: {
          word_count: wordCount,
          duration_seconds: durationSeconds,
          wpm: paceWpm,
          filler_count: fillerCount,
          long_pause_count: Math.max(0, 4 - Math.floor(progressFactor * 3)),
        },
        strengths: [
          'Effective domain terminology and technical framing',
          'Good speaking pace and volume consistency',
        ],
        improvements: [
          {
            priority: 'medium',
            issue: 'Slight hesitation when transitioning between points',
            evidence: '...um so then we looked at the database...',
            recommendation: 'Use clean signposting like "First", "Next", or brief pauses instead of filler words.',
          },
        ],
        corrections: [
          {
            heard: 'worked in this architecture',
            better: 'worked on this architecture',
            why: 'Use "on" when referring to systems or architectures being built.',
          },
        ],
        recurring_mistakes: daysAgo > 25 ? [
          {
            canonical_key: 'preposition_work_on',
            type: 'preposition',
            severity: 'medium',
            example: 'worked in this system',
          },
        ] : [],
      },
      model_provider: 'google',
      model_name: 'gemini-3.6-flash',
      created_at: completedAt.toISOString(),
    });
  }

  // Insert in batches of 20
  console.log(`Inserting ${sessionsToInsert.length} practice sessions...`);
  for (let i = 0; i < sessionsToInsert.length; i += 20) {
    const batch = sessionsToInsert.slice(i, i + 20);
    const { error } = await supabase.from('practice_sessions').insert(batch);
    if (error) throw new Error(`Error inserting sessions batch: ${error.message}`);
  }

  console.log(`Inserting ${recordingsToInsert.length} recordings...`);
  for (let i = 0; i < recordingsToInsert.length; i += 20) {
    const batch = recordingsToInsert.slice(i, i + 20);
    const { error } = await supabase.from('recordings').insert(batch);
    if (error) throw new Error(`Error inserting recordings batch: ${error.message}`);
  }

  console.log(`Inserting ${transcriptsToInsert.length} transcripts...`);
  for (let i = 0; i < transcriptsToInsert.length; i += 20) {
    const batch = transcriptsToInsert.slice(i, i + 20);
    const { error } = await supabase.from('transcripts').insert(batch);
    if (error) throw new Error(`Error inserting transcripts batch: ${error.message}`);
  }

  console.log(`Inserting ${evaluationsToInsert.length} evaluations...`);
  for (let i = 0; i < evaluationsToInsert.length; i += 20) {
    const batch = evaluationsToInsert.slice(i, i + 20);
    const { error } = await supabase.from('evaluations').insert(batch);
    if (error) throw new Error(`Error inserting evaluations batch: ${error.message}`);
  }

  console.log('✅ Successfully seeded 2 months of synthetic analytics data!');
  console.log(`Total sessions created: ${sessionsToInsert.length}`);
  console.log(`Overall score range: ${evaluationsToInsert[0].overall_score} → ${evaluationsToInsert[evaluationsToInsert.length - 1].overall_score}`);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
