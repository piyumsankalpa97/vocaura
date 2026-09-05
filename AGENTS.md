# Master Prompt for Local Coding Agent

You are building a private two-user web application called **Vocaura - Practice your voice. Grow your confidence.** a Professional English Trainer.

Read all files in this specification directory (`/.agent/rules`) before writing application code:

* 00_README.md
* 01_PRODUCT_SPEC.md
* 02_MVP_FEATURES.md
* 03_TECH_ARCHITECTURE.md
* 04_DATABASE_SCHEMA.md
* 05_AI_EVALUATION.md
* 06_PROMPT_LIBRARY.md
* 07_API_AND_COSTS.md
* 08_UI_AND_PAGES.md
* 09_BUILD_PHASES.md
* 10_VOCAURA_DESIGN.md

## Mission

Build the MVP described by these specifications. The application is for two private users who want to improve professional spoken English and track progress over time.

One user is a software engineer. The other user is preparing for professional nursing communication and may later prepare for English requirements relevant to Australia or the UK.

Do not turn this into a generic language-learning platform.

## Non-negotiable requirements

1. Use Next.js App Router + TypeScript.
2. Use Supabase Auth, Postgres, and Storage.
3. Use RLS for user-data isolation.
4. Keep all provider secrets server-side.
5. Use MediaRecorder for primary audio capture.
6. Use Groq Whisper for transcription behind a provider interface.
7. Use Gemini for structured evaluation behind a provider interface.
8. Validate all AI responses with Zod before persistence.
9. Store evaluation data in structured columns plus a JSON payload for extensibility.
10. Do not fabricate pronunciation scores.
11. Do not store real patient-identifying information.
12. Use deterministic calculations for analytics whenever possible.
13. Make the app mobile-friendly for recording and desktop-friendly for analytics.
14. Do not add unnecessary services or infrastructure.
15. Build the smallest useful version first.

## Before coding

Before implementing UI:
use frontend-design
use web-design-guidelines

Before implementing database/schema/RLS:
use supabase-postgres-best-practices

Always follow the project's own `.agents\rules` specifications over generic assumptions.

## Environment variables

Create/update `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Validate environment variables at runtime on the server.

Never expose:

`SUPABASE_SECRET_KEY`
`GROQ_API_KEY`
`GEMINI_API_KEY`

## Database

Create SQL migrations for all tables in `04_DATABASE_SCHEMA.md`.

Enable RLS.

Write policies so authenticated users can only read/write their own records.

Seed practice categories and prompts for:

* software engineering
* nursing
* general workplace
* general fluency

Do not require manually entering data to test the dashboard.

## Auth

Implement:

* sign up
* email/password sign in
* sign out
* protected routes
* profile creation after signup

Provide a clean onboarding form.

## UI

Create these routes:

```text
/login
/onboarding
/dashboard
/practice
/practice/[sessionId]
/session/[sessionId]
/progress
/mistakes
/settings
```

Use a clean professional design.

Avoid excessive gamification.

## Recording

Implement a reusable recording hook.

The hook should expose approximately:

```ts
{
  status,
  duration,
  audioBlob,
  error,
  start,
  pause,
  resume,
  stop,
  reset
}
```

Handle browser permission errors clearly.

Prefer a browser-supported MIME type such as WebM/Opus when available.

Do not assume one MIME type is supported everywhere. Detect support.

## Transcription provider

Create:

```text
lib/providers/speech-to-text.ts
lib/providers/groq-speech.ts
```

The provider should return:

```ts
{
  text: string;
  language?: string;
  segments?: unknown;
  words?: unknown;
}
```

Use Groq's Whisper endpoint server-side.

Request verbose JSON when timestamps are needed.

## Evaluation provider

Create:

```text
lib/providers/language-evaluation.ts
lib/providers/gemini-evaluation.ts
lib/ai/evaluation-schema.ts
lib/ai/prompts.ts
```

The evaluation provider must return typed structured data.

Follow `05_AI_EVALUATION.md` exactly.

The model should not invent corrections.

## Analytics

Compute server-side or client-side from trusted persisted values:

* average score
* score delta
* speaking minutes
* session count
* category trends
* filler count trend

Use Recharts for visualization.

## Mistake tracking

When an evaluation reports a `canonical_key`, upsert a user-owned mistake record.

Increment occurrence count when the same canonical key is detected again.

Create evaluation-to-mistake relations.

## Retry

Support recording another attempt for the same prompt.

Show comparison after analysis.

At minimum compare:

* overall score
* filler count
* WPM
* category scores
* recurring mistakes

## Daily challenge

For MVP:

1. Query recent user scores and unresolved mistakes.
2. Choose the weakest meaningful training area.
3. Choose an unused or older prompt that fits.
4. Optionally ask Gemini to rewrite the challenge naturally.

Do not make challenge generation dependent on an LLM if a deterministic fallback can provide a valid challenge.

## Weekly summary

Use SQL/TypeScript for numerical values.

Use Gemini only for narrative interpretation.

Do not generate fake numbers in the summary.

## External ChatGPT prompt

Create a deterministic prompt from user profile + current weakness + category.

Do not require an OpenAI API key for this feature.

Add a copy button.

## Error handling

Every async operation needs:

* loading state
* success state
* error state
* retry action where appropriate

Do not swallow provider failures.

If transcription fails, keep the recording and mark the session as failed so it can be retried.

If AI analysis fails, keep the transcript and expose a retry action.

## Testing

Add unit tests for:

* score calculation
* weighted overall score
* filler counting
* WPM
* mistake canonicalization
* prompt generation
* Zod validation

Add at least one integration path covering:

`recording metadata -> transcription -> evaluation -> persistence`

If browser recording is hard to automate, mock the audio/provider boundaries rather than skipping the business logic tests.

## Security checklist

Before considering MVP complete:

* RLS enabled on user-owned tables
* private Storage bucket
* storage policies tested
* provider keys server-only
* Zod validation
* authenticated server endpoints
* ownership checks before processing audio
* no real patient data in seed content

## Definition of done

The app is considered MVP-complete when both users can:

1. Sign in.
2. See a personal dashboard.
3. Choose a role-specific speaking exercise.
4. Record an answer.
5. Upload the recording.
6. Transcribe it.
7. Receive structured feedback.
8. See concrete corrections.
9. Retry the answer.
10. Compare improvement.
11. See recurring mistakes.
12. See progress charts.
13. Receive a targeted daily challenge.
14. Copy a personalized ChatGPT conversation prompt.
15. Delete their own recordings/sessions.

## Development style

Prefer small, understandable modules.

Do not introduce Redux, a job queue, Redis, WebSockets, or a microservice architecture unless a concrete requirement appears later.

Do not build fake/demo AI responses as a substitute for real integration once the environment variables are available.

During development, use a provider mock only when writing tests or when the actual API credentials are not configured.

Keep provider-specific code behind interfaces.

After each phase, run type checking, linting, and tests.

At the end, provide:

1. Files created/changed.
2. Environment variables required.
3. Database migration commands.
4. Local development command.
5. Known limitations.
6. Exact next steps.
