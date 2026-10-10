-- Add updated_at column to mistakes table if it doesn't exist
-- This column was defined in the original CREATE TABLE migration but may
-- not be present if the table was created before that line was added.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mistakes'
      and column_name = 'updated_at'
  ) then
    alter table public.mistakes
      add column updated_at timestamptz not null default now();
  end if;
end
$$;

-- Auto-update updated_at on row modification
create or replace function public.handle_mistakes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_mistakes_updated_at on public.mistakes;

create trigger set_mistakes_updated_at
  before update on public.mistakes
  for each row
  execute function public.handle_mistakes_updated_at();
