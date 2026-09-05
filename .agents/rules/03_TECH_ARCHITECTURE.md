# Technical Architecture

## Stack

```text
Next.js App Router
TypeScript
Tailwind CSS
Accessible component library
Supabase Auth
Supabase Postgres
Supabase Storage
Server Route Handlers / Server Actions
Zod
Recharts
Groq Whisper
Gemini API
```

## High-level architecture

```text
Browser
  │
  ├── Auth session
  ├── Dashboard UI
  ├── MediaRecorder
  └── Audio player
       │
       ▼
Next.js server layer
  │
  ├── /api/transcribe
  │      └── Groq Whisper
  │
  ├── /api/analyze
  │      └── Gemini structured analysis
  │
  ├── /api/recommend
  │      └── Gemini or deterministic rules + Gemini
  │
  └── /api/chatgpt-prompt
         └── deterministic prompt composition
       │
       ▼
Supabase
  ├── Auth
  ├── Postgres
  └── Private Storage
```

## Important security rule

AI provider API keys must never be exposed in browser JavaScript.

All provider calls must happen server-side.

Use environment variables only on the server:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
```

The service role key must never be prefixed with `NEXT_PUBLIC_`.

## Supabase client pattern

Use the recommended Supabase SSR pattern for Next.js:

* Browser client for authenticated browser operations.
* Server client for server-side requests.
* Service-role client only for trusted server-side administrative jobs where absolutely necessary.

Prefer user-authenticated queries with RLS over service-role access.

## Audio flow

```text
MediaRecorder
   ↓
Blob
   ↓
Client requests upload/session creation
   ↓
Private Storage upload
   ↓
Create recording row
   ↓
POST /api/transcribe
   ↓
Provider transcription
   ↓
Save transcript
   ↓
POST /api/analyze
   ↓
Save evaluation
```

For MVP, sequential processing is fine. A background queue is not necessary.

## Storage

Use a private bucket such as:

`practice-audio`

Path recommendation:

```text
{user_id}/{session_id}/{recording_id}.webm
```

Storage policies must ensure a user can access only their own recordings.

Supabase recommends storing large files in Storage rather than Postgres and supports row-level/security policies around Storage objects. citeturn495206search0turn495206search11

## API routes

### POST `/api/transcribe`

Input:

```json
{
  "recordingId": "uuid"
}
```

Server:

1. Verify authenticated user.
2. Load recording.
3. Verify ownership.
4. Read private audio.
5. Call Groq Whisper.
6. Save transcript + timestamps.
7. Update status.

### POST `/api/analyze`

Input:

```json
{
  "sessionId": "uuid"
}
```

Server:

1. Verify authenticated user.
2. Load session, profile, transcript, timing metadata.
3. Build analysis prompt.
4. Call Gemini.
5. Validate JSON with Zod.
6. Persist evaluation and mistakes.

### POST `/api/daily-challenge`

Can use deterministic selection first, then Gemini to phrase the final challenge naturally.

### POST `/api/weekly-summary`

Build summary from stored evaluations. Use deterministic calculations for numerical trends and Gemini only for narrative interpretation.

## Data ownership

Every application table containing user data must have a `user_id` field or an ownership relation that can be derived safely.

RLS should be enabled on all such tables.

## Error handling

Every AI/provider request must have:

* timeout
* retry policy where safe
* user-friendly failure message
* server logs without leaking API keys
* persisted processing status

Do not hide failures by writing fake evaluation data.

## Cost-control architecture

Use small inputs wherever possible.

For analysis, send:

* scenario prompt
* user role/context
* transcript
* measurable timing stats
* recent relevant mistake patterns

Do not send the entire historical database to the model.

Use deterministic SQL/TypeScript calculations for:

* session counts
* total minutes
* score averages
* score deltas
* filler counts when transcript matching supports it
* word counts
* words per minute

Use LLMs where interpretation is actually needed.
