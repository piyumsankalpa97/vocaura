-- 20260917_user_vocabulary.sql

-- 1. Create user_vocabulary table
create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null,
  category text not null default 'General',
  created_at timestamptz not null default now(),
  constraint user_vocabulary_user_entity_unique unique (user_id, entity)
);

-- Enable RLS
alter table public.user_vocabulary enable row level security;

-- Policies for user_vocabulary
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'user_vocabulary' and policyname = 'Users can view their own vocabulary'
  ) then
    create policy "Users can view their own vocabulary"
      on public.user_vocabulary for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'user_vocabulary' and policyname = 'Users can insert their own vocabulary'
  ) then
    create policy "Users can insert their own vocabulary"
      on public.user_vocabulary for insert
      to authenticated
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'user_vocabulary' and policyname = 'Users can update their own vocabulary'
  ) then
    create policy "Users can update their own vocabulary"
      on public.user_vocabulary for update
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'user_vocabulary' and policyname = 'Users can delete their own vocabulary'
  ) then
    create policy "Users can delete their own vocabulary"
      on public.user_vocabulary for delete
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end $$;

-- Indexes
create index if not exists user_vocabulary_user_id_idx
  on public.user_vocabulary(user_id, created_at desc);

-- 2. Alter transcripts table to support pre-processing LLM optimization
alter table public.transcripts 
  add column if not exists original_text text;

alter table public.transcripts 
  add column if not exists optimization_changes jsonb default '[]'::jsonb;
