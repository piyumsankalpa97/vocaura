# MVP Features and Acceptance Criteria

## Authentication

### Must have

* Email/password login with Supabase Auth.
* Sign out.
* Protected application routes.
* User profile row linked to `auth.users`.
* Two user profiles can use the same application independently.

### Acceptance

A logged-out user cannot access another user's dashboard, sessions, recordings, or analytics.

## Onboarding

Collect:

* Display name
* Professional role
* Primary goals
* Preferred practice contexts
* Current self-rated confidence from 1 to 10

Seed role-specific defaults:

### Software engineer

Interview, client communication, technical explanation, meetings, workplace English.

### Nurse

Nursing interview, patient communication, handover, workplace English, IELTS/OET practice.

## Practice catalog

Store scenario templates in the database or seed files.

Required categories:

* interview
* workplace
* client_communication
* technical_explanation
* patient_communication
* clinical_handover
* general_fluency

Role-specific categories can be filtered.

## Recording

Requirements:

* Start/stop recording.
* Pause/resume if browser support allows it.
* Show elapsed time.
* Request microphone permission cleanly.
* Save recorded audio as a browser-supported format.
* Upload to private Supabase Storage.

A fallback text-answer mode should exist if recording is unavailable, but text mode must clearly state that speech-specific metrics cannot be calculated.

## Transcription

Server-side endpoint receives the audio and calls the configured speech-to-text provider.

Store:

* transcript text
* duration
* optional word/segment timestamps
* provider/model
* processing status
* error information

## Analysis

The AI analysis endpoint receives structured session context plus transcript and timing data.

Return strict JSON matching the schema in `05_AI_EVALUATION.md`.

## Results

Display:

* Overall training score
* 7 category scores
* Strong points
* Weak points
* Exact or near-exact corrections
* Natural alternatives
* Recurring mistakes
* Next exercise

## Retry

A retry should allow the user to record another answer to the same prompt.

The system must compare the retry against the previous attempt where possible.

## Progress

Charts:

* Overall score trend
* Category trend
* Weekly practice minutes
* Session count

Time ranges:

* 7 days
* 30 days
* 90 days
* All time

## Mistake tracker

Each detected mistake can have:

* type
* incorrect example
* corrected example
* explanation
* severity
* first seen date
* latest seen date
* occurrence count
* resolved flag

The same mistake should not create a brand-new record every session when it can be matched to an existing canonical pattern.

## Daily challenge

Generate one recommended exercise from recent data.

The recommendation should include:

* title
* reason
* prompt
* expected skill
* estimated duration

## Weekly summary

Show:

* total sessions
* speaking minutes
* average score
* score delta versus previous period
* strongest improvement
* biggest ongoing weakness
* top recurring errors
* next focus

## Copy to ChatGPT

Provide a copy button that creates a tailored prompt.

The copied prompt should not contain private data that is unnecessary for the exercise.
