-- 20260904_core_tables.sql

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null,
  professional_context text,
  goals text[] not null default '{}',
  confidence_self_rating integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert their own profile') then
    create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile" on public.profiles for update to authenticated using (id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can delete their own profile') then
    create policy "Users can delete their own profile" on public.profiles for delete to authenticated using (id = (select auth.uid()));
  end if;
end $$;

-- 2. Practice Categories
create table if not exists public.practice_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  role_scope text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.practice_categories enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'practice_categories' and policyname = 'Anyone can view practice categories') then
    create policy "Anyone can view practice categories" on public.practice_categories for select to authenticated using (true);
  end if;
end $$;


-- 3. Practice Prompts
create table if not exists public.practice_prompts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.practice_categories(id) on delete set null,
  role_scope text[] not null default '{}',
  difficulty integer not null default 1,
  title text not null,
  prompt text not null,
  context text,
  expected_skills text[] not null default '{}',
  estimated_minutes integer not null default 5,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.practice_prompts enable row level security;
-- Note: Further policies and user_id are handled in 20260906_practice_prompts_user_id.sql


-- 4. Practice Sessions
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid references public.practice_prompts(id) on delete set null,
  category_id uuid references public.practice_categories(id) on delete set null,
  mode text not null,
  status text not null default 'created',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.practice_sessions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'practice_sessions' and policyname = 'Users can view their own sessions') then
    create policy "Users can view their own sessions" on public.practice_sessions for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'practice_sessions' and policyname = 'Users can insert their own sessions') then
    create policy "Users can insert their own sessions" on public.practice_sessions for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'practice_sessions' and policyname = 'Users can update their own sessions') then
    create policy "Users can update their own sessions" on public.practice_sessions for update to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'practice_sessions' and policyname = 'Users can delete their own sessions') then
    create policy "Users can delete their own sessions" on public.practice_sessions for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

create index if not exists practice_sessions_user_id_created_at_idx on public.practice_sessions(user_id, created_at desc);


-- 5. Recordings
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  duration_seconds numeric,
  file_size_bytes bigint,
  provider text,
  provider_model text,
  transcription_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.recordings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'recordings' and policyname = 'Users can view their own recordings') then
    create policy "Users can view their own recordings" on public.recordings for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recordings' and policyname = 'Users can insert their own recordings') then
    create policy "Users can insert their own recordings" on public.recordings for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recordings' and policyname = 'Users can update their own recordings') then
    create policy "Users can update their own recordings" on public.recordings for update to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recordings' and policyname = 'Users can delete their own recordings') then
    create policy "Users can delete their own recordings" on public.recordings for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

create index if not exists recordings_user_id_created_at_idx on public.recordings(user_id, created_at desc);


-- 6. Weekly Summaries
create table if not exists public.weekly_summaries (
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
  created_at timestamptz not null default now(),
  unique(user_id, period_start, period_end)
);

alter table public.weekly_summaries enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'weekly_summaries' and policyname = 'Users can view their own weekly summaries') then
    create policy "Users can view their own weekly summaries" on public.weekly_summaries for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'weekly_summaries' and policyname = 'Users can insert their own weekly summaries') then
    create policy "Users can insert their own weekly summaries" on public.weekly_summaries for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'weekly_summaries' and policyname = 'Users can update their own weekly summaries') then
    create policy "Users can update their own weekly summaries" on public.weekly_summaries for update to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'weekly_summaries' and policyname = 'Users can delete their own weekly summaries') then
    create policy "Users can delete their own weekly summaries" on public.weekly_summaries for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

create index if not exists weekly_summaries_user_id_period_start_idx on public.weekly_summaries(user_id, period_start desc);
