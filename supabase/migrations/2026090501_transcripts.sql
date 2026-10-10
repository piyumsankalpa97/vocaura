-- Create transcripts table if not exists
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references public.recordings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  language text default 'en',
  word_count integer,
  segment_timestamps jsonb,
  word_timestamps jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.transcripts enable row level security;

-- Policies for transcripts
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'transcripts' and policyname = 'Users can select their own transcripts'
  ) then
    create policy "Users can select their own transcripts"
      on public.transcripts for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'transcripts' and policyname = 'Users can insert their own transcripts'
  ) then
    create policy "Users can insert their own transcripts"
      on public.transcripts for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'transcripts' and policyname = 'Users can update their own transcripts'
  ) then
    create policy "Users can update their own transcripts"
      on public.transcripts for update
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'transcripts' and policyname = 'Users can delete their own transcripts'
  ) then
    create policy "Users can delete their own transcripts"
      on public.transcripts for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

-- Indexes
create index if not exists transcripts_user_id_created_at_idx 
  on public.transcripts(user_id, created_at desc);

create index if not exists transcripts_recording_id_idx 
  on public.transcripts(recording_id);
