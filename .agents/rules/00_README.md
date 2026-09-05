# Professional English Trainer

A private two-user web app for Piyum and his wife to practice professional spoken English, receive structured feedback, and track measurable improvement over time.

## Purpose

This is a personal training system, not a generic English-learning platform.

The system should help each person:

1. Practice realistic professional conversations.
2. Record spoken answers.
3. Transcribe recordings.
4. Analyze language quality and communication performance.
5. Detect recurring weaknesses.
6. Generate targeted practice tasks.
7. Track improvement over weeks and months.
8. Export/copy prompts for external AI conversations such as ChatGPT.

## Users

### User A: Piyum

Primary contexts:

* Software engineering interviews
* Technical explanations
* Client communication
* Project discussions
* Workplace English
* General professional fluency

### User B: Wife

Primary contexts:

* Nursing interviews
* Patient communication practice
* Clinical workplace communication
* Handover communication
* Doctor/nurse communication
* IELTS/OET-oriented general speaking practice

The nursing content is practice content only. Do not encourage storing real patient-identifiable information.

## Core product principle

Do not optimize for sounding sophisticated. Optimize for:

**clear + natural + confident + professional + easy to understand**

A person's accent alone is not a defect. The application should focus on communication effectiveness, not forcing a British, Australian, or American accent.

## MVP stack

* Next.js with App Router
* TypeScript
* Tailwind CSS
* shadcn/ui or equivalent accessible component primitives
* Supabase Auth
* Supabase Postgres
* Supabase Storage
* Recharts
* Zod
* Groq Whisper for server-side speech-to-text
* Gemini API for structured language analysis

Supabase's current Free plan is suitable for a two-user personal application and includes a Postgres database, Auth, and 1 GB file storage. Free projects can pause after inactivity, which is acceptable for a personal MVP. See `07_API_AND_COSTS.md`. citeturn495206search2turn320240search4

## Important product boundaries

Do not build these in MVP:

* Public user registration
* Social features
* Leaderboards
* Payments
* Native mobile apps
* AI avatars
* Real-time voice agents
* Full IELTS/OET exam simulation
* Pronunciation scoring presented as scientifically precise

## Documents

* `01_PRODUCT_SPEC.md` Product goals and user journeys
* `02_MVP_FEATURES.md` Exact MVP scope and acceptance criteria
* `03_TECH_ARCHITECTURE.md` Application and API architecture
* `04_DATABASE_SCHEMA.md` Database tables, relationships, indexes, and RLS
* `05_AI_EVALUATION.md` Evaluation framework, scoring model, and output contracts
* `06_PROMPT_LIBRARY.md` Prompt templates for the AI layer and generated ChatGPT prompts
* `07_API_AND_COSTS.md` Current API choices, privacy notes, and cost strategy
* `08_UI_AND_PAGES.md` Page structure and UX requirements
* `09_BUILD_PHASES.md` Implementation order and test checkpoints
* `10_VOCAURA_DESIGN.md` Design system, color palette, and branding guidance

## Current implementation recommendation

Use asynchronous post-recording analysis for MVP:

`record -> upload -> transcribe -> analyze -> save -> show results`

Do not start with streaming transcription or a real-time AI voice agent. Those add complexity without being necessary to prove the core training loop.
