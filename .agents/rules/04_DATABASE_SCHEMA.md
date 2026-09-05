# Database Schema

Use UUID primary keys.

Timestamps should use `timestamptz`.

## `profiles`

```sql
id uuid primary key references auth.users(id) on delete cascade,
display_name text not null,
role text not null,
professional_context text,
goals text[] not null default '{}',
confidence_self_rating integer,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## `practice_categories`

```sql
id uuid primary key default gen_random_uuid(),
slug text unique not null,
name text not null,
description text,
role_scope text[] not null default '{}',
created_at timestamptz not null default now()
```

## `practice_prompts`

```sql
id uuid primary key default gen_random_uuid(),
category_id uuid references practice_categories(id) on delete set null,
role_scope text[] not null default '{}',
difficulty integer not null default 1,
title text not null,
prompt text not null,
context text,
expected_skills text[] not null default '{}',
estimated_minutes integer not null default 5,
active boolean not null default true,
created_at timestamptz not null default now()
```

## `practice_sessions`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
prompt_id uuid references practice_prompts(id) on delete set null,
category_id uuid references practice_categories(id) on delete set null,
mode text not null,
status text not null default 'created',
started_at timestamptz,
completed_at timestamptz,
created_at timestamptz not null default now()
```

Suggested status values:

`created`, `recording`, `uploaded`, `transcribing`, `analyzing`, `completed`, `failed`

## `recordings`

```sql
id uuid primary key default gen_random_uuid(),
session_id uuid not null references practice_sessions(id) on delete cascade,
user_id uuid not null references auth.users(id) on delete cascade,
storage_path text not null,
mime_type text,
duration_seconds numeric,
file_size_bytes bigint,
provider text,
provider_model text,
transcription_status text not null default 'pending',
created_at timestamptz not null default now()
```

## `transcripts`

```sql
id uuid primary key default gen_random_uuid(),
recording_id uuid not null unique references recordings(id) on delete cascade,
user_id uuid not null references auth.users(id) on delete cascade,
text text not null,
language text default 'en',
word_count integer,
segment_timestamps jsonb,
word_timestamps jsonb,
created_at timestamptz not null default now()
```

## `evaluations`

```sql
id uuid primary key default gen_random_uuid(),
session_id uuid not null unique references practice_sessions(id) on delete cascade,
user_id uuid not null references auth.users(id) on delete cascade,
overall_score numeric not null,
fluency_score numeric,
grammar_score numeric,
vocabulary_score numeric,
clarity_score numeric,
professionalism_score numeric,
structure_score numeric,
filler_control_score numeric,
pace_wpm numeric,
analysis_json jsonb not null,
model_provider text,
model_name text,
created_at timestamptz not null default now()
```

## `mistakes`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
canonical_key text not null,
type text not null,
incorrect_example text,
corrected_example text,
explanation text,
severity text default 'medium',
occurrence_count integer not null default 1,
first_seen_at timestamptz not null default now(),
last_seen_at timestamptz not null default now(),
resolved boolean not null default false
```

Unique recommendation:

`unique(user_id, canonical_key)`

## `evaluation_mistakes`

Join table:

```sql
evaluation_id uuid not null references evaluations(id) on delete cascade,
mistake_id uuid not null references mistakes(id) on delete cascade,
example_in_session text,
primary key (evaluation_id, mistake_id)
```

## `weekly_summaries`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
period_start date not null,
period_end date not null,
session_count integer not null default 0,
speaking_minutes numeric not null default 0,
average_score numeric,
previous_average_score numeric,
score_delta numeric,
summary_json jsonb not null,
created_at timestamptz not null default now()
```

Unique recommendation:

`unique(user_id, period_start, period_end)`

## Indexes

Create indexes for:

```sql
practice_sessions(user_id, created_at desc)
recordings(user_id, created_at desc)
transcripts(user_id, created_at desc)
evaluations(user_id, created_at desc)
mistakes(user_id, resolved, occurrence_count desc)
weekly_summaries(user_id, period_start desc)
```

## RLS

Enable RLS on every table containing user-owned records.

Conceptually:

```sql
user_id = auth.uid()
```

For `evaluation_mistakes`, access should be granted only when the referenced evaluation or mistake belongs to `auth.uid()`.

Do not rely on frontend filtering for security.

## Seed content

Seed enough prompts to test both profiles immediately:

* 10 software engineering prompts
* 10 nursing prompts
* 10 general workplace prompts
* 5 general fluency prompts

Do not use real patient data in nursing prompts.
