-- Create evaluations table if not exists
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.practice_sessions(id) on delete cascade,
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
);

-- Enable RLS
alter table public.evaluations enable row level security;

-- Policies for evaluations
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluations' and policyname = 'Users can select their own evaluations'
  ) then
    create policy "Users can select their own evaluations"
      on public.evaluations for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluations' and policyname = 'Users can insert their own evaluations'
  ) then
    create policy "Users can insert their own evaluations"
      on public.evaluations for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluations' and policyname = 'Users can update their own evaluations'
  ) then
    create policy "Users can update their own evaluations"
      on public.evaluations for update
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluations' and policyname = 'Users can delete their own evaluations'
  ) then
    create policy "Users can delete their own evaluations"
      on public.evaluations for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

-- Indexes
create index if not exists evaluations_user_id_created_at_idx 
  on public.evaluations(user_id, created_at desc);

create index if not exists evaluations_session_id_idx 
  on public.evaluations(session_id);
