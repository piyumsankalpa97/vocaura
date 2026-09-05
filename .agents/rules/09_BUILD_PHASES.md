# Build Phases

The goal is to get to a usable private MVP quickly.

## Phase 1: Project foundation

Build:

* Next.js app
* TypeScript
* Tailwind
* Supabase integration
* Auth
* Protected routes
* Base layout
* Environment validation

Checkpoint:

Both users can sign in and reach their own empty dashboard.

## Phase 2: Database and seed data

Build:

* migrations
* RLS
* profile creation
* practice categories
* seeded prompts

Checkpoint:

Each user sees only their own profile and correctly filtered practice prompts.

## Phase 3: Recording

Build:

* MediaRecorder hook
* recording UI
* audio upload
* private Storage bucket
* recording metadata

Checkpoint:

A user can record, save, playback, and delete an audio recording.

## Phase 4: Transcription

Build:

* server provider interface
* Groq implementation
* transcript persistence
* timestamp handling
* processing state
* failure state

Checkpoint:

A recorded English response produces a stored transcript.

## Phase 5: Evaluation

Build:

* evaluation Zod schema
* Gemini provider interface
* evaluation prompt
* result persistence
* result UI

Checkpoint:

A completed session produces valid structured feedback with no malformed data saved.

## Phase 6: Mistake intelligence

Build:

* canonical mistake matching
* occurrence counters
* mistake page
* recurring weakness dashboard card

Checkpoint:

Repeated errors accumulate instead of creating unrelated duplicates.

## Phase 7: Progress analytics

Build:

* trend queries
* Recharts
* score calculations
* period filters
* weekly summary

Checkpoint:

Two months of synthetic seed data can produce a believable progress dashboard.

## Phase 8: Personalization

Build:

* daily challenge generator
* role-aware prompts
* weakness-aware prompt selection
* retry comparison

Checkpoint:

The application recommends different challenges for the two users based on actual data.

## Phase 9: External ChatGPT prompt export

Build:

* prompt composer
* copy button
* prompt preview

Checkpoint:

A personalized conversation prompt can be copied to ChatGPT in one click.

## Phase 10: Hardening

Build:

* rate limiting
* better loading states
* error boundaries
* logging
* input validation
* accessibility pass
* mobile recording testing
* browser compatibility testing

## Post-MVP backlog

Only after MVP usage proves the training loop is useful:

* real-time AI conversation
* TTS voices
* pronunciation analysis
* spaced repetition for mistakes
* calendar-based practice reminders
* PDF progress report
* advanced exam preparation
* direct external AI integrations
