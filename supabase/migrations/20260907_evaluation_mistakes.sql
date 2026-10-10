-- evaluation_mistakes join table (split out of 2026090601_mistakes.sql so it runs after 20260906_evaluations.sql,
-- which it references). Fully idempotent: a no-op on databases that already applied the old combined migration.

-- Create evaluation_mistakes join table if not exists
create table if not exists public.evaluation_mistakes (
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  mistake_id uuid not null references public.mistakes(id) on delete cascade,
  example_in_session text,
  created_at timestamptz not null default now(),
  primary key (evaluation_id, mistake_id)
);


alter table public.evaluation_mistakes enable row level security;

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


create index if not exists evaluation_mistakes_mistake_id_idx 
  on public.evaluation_mistakes(mistake_id);
