-- "Hou My Dop" — persoonlike dophoulys op buitelyn.com/markte.
create table dophou (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  simbool text not null,
  naam text,
  geskep_at timestamptz not null default now(),
  unique (user_id, simbool)
);
create index dophou_user_idx on dophou(user_id);
alter table dophou enable row level security;

create policy "eie dophou lees" on dophou
  for select using (auth.uid() = user_id);
create policy "eie dophou byvoeg" on dophou
  for insert with check (auth.uid() = user_id);
create policy "eie dophou skrap" on dophou
  for delete using (auth.uid() = user_id);
