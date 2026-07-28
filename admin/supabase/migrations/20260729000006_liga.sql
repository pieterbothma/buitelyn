-- Buitelyn Liga: fantasie-JSE met R100 000 denkbeeldige geld per maand-rondte.
-- Vroeë aansluiters kry blywende lidnommers (01, 02, ...) — spogregte.
create table if not exists public.liga_spelers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nommer serial unique,
  naam text not null,
  kontant numeric not null default 100000,
  aangesluit_at timestamptz not null default now()
);

create table if not exists public.liga_houdings (
  user_id uuid not null references public.liga_spelers (user_id) on delete cascade,
  simbool text not null,
  naam text,
  aantal numeric not null check (aantal > 0),
  koopprys numeric not null, -- rand per aandeel by uitvoering
  gekoop_at timestamptz not null default now(),
  primary key (user_id, simbool)
);

-- Maand-uitslae vir die jaarranglys
create table if not exists public.liga_uitslae (
  maand text not null, -- "2026-08"
  user_id uuid not null references public.liga_spelers (user_id) on delete cascade,
  naam text not null,
  nommer int not null,
  slotwaarde numeric not null,
  opbrengs_persent numeric not null,
  posisie int not null,
  primary key (maand, user_id)
);

alter table public.liga_spelers enable row level security;
alter table public.liga_houdings enable row level security;
alter table public.liga_uitslae enable row level security;

-- Die ranglys is juis openbaar binne die app: alle aangemeldes mag lees.
create policy liga_spelers_lees on public.liga_spelers for select to authenticated using (true);
create policy liga_houdings_lees on public.liga_houdings for select to authenticated using (true);
create policy liga_uitslae_lees on public.liga_uitslae for select to authenticated using (true);
-- Skryf gebeur uitsluitlik deur die bediener (service role) — geen eie-skryf-policies nie.

-- Publieke avatars-emmer vir profielfotos
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars publiek leesbaar" on storage.objects
  for select using (bucket_id = 'avatars');
