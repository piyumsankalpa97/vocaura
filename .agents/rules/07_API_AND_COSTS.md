# APIs, Providers, and Cost Strategy

This document reflects the provider information checked on **September 5, 2026**. Provider pricing and model availability can change, so keep providers configurable.

## Recommended provider split

### Speech to text: Groq Whisper

Groq currently exposes OpenAI-compatible speech-to-text endpoints and supports `whisper-large-v3` and `whisper-large-v3-turbo`. The current documentation lists `whisper-large-v3-turbo` at **$0.04/hour** and `whisper-large-v3` at **$0.111/hour**. Groq also supports word and segment timestamps for verbose JSON responses. citeturn373910search0turn373910search5

Recommendation for MVP:

`whisper-large-v3-turbo`

Use `whisper-large-v3` later when accuracy matters more than cost/speed.

### AI analysis: Gemini API

Google's current Gemini API pricing page provides a free tier for selected models and paid tiers with higher limits. The exact free limits vary by model and may change, so do not hard-code assumptions about unlimited free usage. citeturn320240search0

Recommendation:

Keep the Gemini model ID configurable:

```env
GEMINI_MODEL=gemini-2.5-flash
```

The current Gemini model catalog lists Gemini 2.5 Flash as a low-latency, high-volume model and also lists newer model families. Keep this configurable so the app can move models without code rewrites. citeturn320240search3

### Database/Auth/Storage: Supabase

Supabase's current Free plan includes:

* $0/month
* Postgres database
* 500 MB database size
* 1 GB file storage
* 5 GB egress
* 50,000 monthly active users
* two active free projects

The free plan can pause projects after inactivity. For a two-person personal app, the resource limits are comfortably above expected usage. citeturn495206search10turn495206search5

Supabase Auth supports email/password authentication and integrates with row-level security for database authorization. citeturn320240search1turn320240search4

## Browser speech recognition

The Web Speech API can provide speech recognition and speech synthesis directly in the browser, including on-device recognition where supported. However, `SpeechRecognition` remains limited-availability and is not supported consistently across widely used browsers. citeturn495206search3turn495206search4

Recommendation:

Use `MediaRecorder` for the primary recording path and server transcription for consistent results.

The browser Speech Recognition API may be used as an optional live transcript/fallback enhancement, not as the authoritative stored transcript.

## Approximate transcription cost

Groq's documented turbo rate is $0.04/hour. citeturn373910search2

For example, if two users together record 1 hour/day for 30 days:

`30 hours × $0.04 ≈ $1.20/month`

This calculation excludes other API/database costs.

## LLM cost strategy

Do not call the LLM for every small UI action.

Use deterministic calculations whenever possible.

Call the LLM for:

* language evaluation
* personalized coaching feedback
* challenge generation when rules are insufficient
* narrative weekly summaries

Do not call the LLM for:

* session counts
* total minutes
* averages
* deltas
* simple trend charts
* word counts

## Privacy

Audio recordings and transcripts are personal user-generated data. Keep the bucket private and enforce authorization with Supabase policies. Supabase Storage supports private access and policy-based controls. citeturn495206search0turn495206search12

For nursing practice, do not store real patient details.

## Provider abstraction

Create interfaces instead of wiring provider SDKs directly throughout the app:

```ts
interface SpeechToTextProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

interface LanguageEvaluationProvider {
  evaluate(input: EvaluationInput): Promise<EvaluationResult>;
}
```

Implement:

* `GroqSpeechProvider`
* `GeminiEvaluationProvider`

This makes future provider switching straightforward.
