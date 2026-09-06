-- Add user_id column to practice_prompts for user-specific / daily challenge prompts
alter table public.practice_prompts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Index for user-scoped queries and joins
create index if not exists practice_prompts_user_id_idx 
  on public.practice_prompts(user_id);

-- Enable RLS
alter table public.practice_prompts enable row level security;

-- Policies for practice_prompts
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'practice_prompts' and policyname = 'Users can view global prompts and their own prompts'
  ) then
    create policy "Users can view global prompts and their own prompts"
      on public.practice_prompts for select
      to authenticated
      using (user_id is null or user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'practice_prompts' and policyname = 'Users can insert their own practice prompts'
  ) then
    create policy "Users can insert their own practice prompts"
      on public.practice_prompts for insert
      to authenticated
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'practice_prompts' and policyname = 'Users can update their own practice prompts'
  ) then
    create policy "Users can update their own practice prompts"
      on public.practice_prompts for update
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'practice_prompts' and policyname = 'Users can delete their own practice prompts'
  ) then
    create policy "Users can delete their own practice prompts"
      on public.practice_prompts for delete
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end $$;
