-- Create mistakes table if not exists
create table if not exists public.mistakes (
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
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mistakes_user_canonical_key_unique unique (user_id, canonical_key)
);

-- Enable RLS
alter table public.mistakes enable row level security;

-- Policies for mistakes
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'mistakes' and policyname = 'Users can select their own mistakes'
  ) then
    create policy "Users can select their own mistakes"
      on public.mistakes for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'mistakes' and policyname = 'Users can insert their own mistakes'
  ) then
    create policy "Users can insert their own mistakes"
      on public.mistakes for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'mistakes' and policyname = 'Users can update their own mistakes'
  ) then
    create policy "Users can update their own mistakes"
      on public.mistakes for update
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'mistakes' and policyname = 'Users can delete their own mistakes'
  ) then
    create policy "Users can delete their own mistakes"
      on public.mistakes for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

-- Indexes
create index if not exists mistakes_user_id_resolved_occurrence_idx 
  on public.mistakes(user_id, resolved, occurrence_count desc);
