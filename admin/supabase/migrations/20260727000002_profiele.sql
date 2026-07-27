-- Public buitelyn.com user profiles. Auto-created on signup by trigger
-- (Google logins bring full_name + avatar); owner-only RLS.
create table profiele (
  user_id uuid primary key references auth.users(id) on delete cascade,
  naam text,
  avatar_url text,
  geskep_at timestamptz not null default now()
);
alter table profiele enable row level security;

create policy "eie profiel lees" on profiele
  for select using (auth.uid() = user_id);
create policy "eie profiel verander" on profiele
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eie profiel skep" on profiele
  for insert with check (auth.uid() = user_id);

create or replace function public.hanteer_nuwe_gebruiker()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiele (user_id, naam, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.hanteer_nuwe_gebruiker();

-- Backfill bestaande gebruikers
insert into profiele (user_id, naam, avatar_url)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (user_id) do nothing;
