-- Public buitelyn.com/markte user portfolios (Supabase-auth users, magic
-- link). Owner-only RLS — completely separate from AP HQ's allowlist-gated
-- business tables in this shared project.
create table portefeuljes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  simbool text not null,
  naam text,
  aantal numeric not null check (aantal > 0),
  koopprys numeric not null check (koopprys >= 0),
  geskep_at timestamptz not null default now()
);
create index portefeuljes_user_idx on portefeuljes(user_id);
alter table portefeuljes enable row level security;

create policy "eie rye lees" on portefeuljes
  for select using (auth.uid() = user_id);
create policy "eie rye byvoeg" on portefeuljes
  for insert with check (auth.uid() = user_id);
create policy "eie rye verander" on portefeuljes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eie rye skrap" on portefeuljes
  for delete using (auth.uid() = user_id);
