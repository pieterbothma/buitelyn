-- Pryswaarskuwings: gebruiker-gestelde drempels ("NPN onder R800") wat die
-- bot binne ±15 min afvuur. Ry bly ná afvuur (grys in die UI) tot geskrap.
create table if not exists public.prys_waarskuwings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  simbool text not null,
  naam text,
  rigting text not null check (rigting in ('bo', 'onder')),
  drempel numeric not null check (drempel > 0),
  geskep_at timestamptz not null default now(),
  afgevuur_at timestamptz,
  afgevuur_prys numeric
);

create index if not exists prys_waarskuwings_user_idx on public.prys_waarskuwings (user_id);
create index if not exists prys_waarskuwings_aktief_idx on public.prys_waarskuwings (simbool) where afgevuur_at is null;

alter table public.prys_waarskuwings enable row level security;

create policy prys_waarskuwings_eie on public.prys_waarskuwings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Die Portefeulje-blad (sessie-klient) wys of Telegram gekoppel is
create policy telegram_koppelinge_eie_lees on public.telegram_koppelinge
  for select using (auth.uid() = user_id);
