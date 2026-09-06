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

-- Create evaluation_mistakes join table if not exists
create table if not exists public.evaluation_mistakes (
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  mistake_id uuid not null references public.mistakes(id) on delete cascade,
  example_in_session text,
  created_at timestamptz not null default now(),
  primary key (evaluation_id, mistake_id)
);

-- Enable RLS
alter table public.mistakes enable row level security;
alter table public.evaluation_mistakes enable row level security;

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

-- Policies for evaluation_mistakes
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluation_mistakes' and policyname = 'Users can select their own evaluation mistakes'
  ) then
    create policy "Users can select their own evaluation mistakes"
      on public.evaluation_mistakes for select
      to authenticated
      using (
        exists (
          select 1 from public.evaluations e
          where e.id = evaluation_mistakes.evaluation_id
            and e.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluation_mistakes' and policyname = 'Users can insert their own evaluation mistakes'
  ) then
    create policy "Users can insert their own evaluation mistakes"
      on public.evaluation_mistakes for insert
      to authenticated
      with check (
        exists (
          select 1 from public.evaluations e
          where e.id = evaluation_mistakes.evaluation_id
            and e.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluation_mistakes' and policyname = 'Users can update their own evaluation mistakes'
  ) then
    create policy "Users can update their own evaluation mistakes"
      on public.evaluation_mistakes for update
      to authenticated
      using (
        exists (
          select 1 from public.evaluations e
          where e.id = evaluation_mistakes.evaluation_id
            and e.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'evaluation_mistakes' and policyname = 'Users can delete their own evaluation mistakes'
  ) then
    create policy "Users can delete their own evaluation mistakes"
      on public.evaluation_mistakes for delete
      to authenticated
      using (
        exists (
          select 1 from public.evaluations e
          where e.id = evaluation_mistakes.evaluation_id
            and e.user_id = (select auth.uid())
        )
      );
  end if;
end $$;

-- Indexes
create index if not exists mistakes_user_id_resolved_occurrence_idx 
  on public.mistakes(user_id, resolved, occurrence_count desc);

create index if not exists evaluation_mistakes_mistake_id_idx 
  on public.evaluation_mistakes(mistake_id);
