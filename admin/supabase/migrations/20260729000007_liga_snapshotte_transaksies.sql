-- Beursliga verdieping: daaglikse waarde-snapshotte (die maand-grafiek)
-- en 'n transaksie-log (die sosiale voer + geskiedenis).
create table if not exists public.liga_snapshotte (
  datum date not null,
  user_id uuid not null references public.liga_spelers (user_id) on delete cascade,
  waarde numeric not null,
  primary key (datum, user_id)
);

create table if not exists public.liga_transaksies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.liga_spelers (user_id) on delete cascade,
  aksie text not null check (aksie in ('koop', 'verkoop')),
  simbool text not null,
  naam text,
  aantal numeric not null,
  prys numeric not null,
  tyd timestamptz not null default now()
);

create index if not exists liga_transaksies_tyd_idx on public.liga_transaksies (tyd desc);

alter table public.liga_snapshotte enable row level security;
alter table public.liga_transaksies enable row level security;

create policy liga_snapshotte_lees on public.liga_snapshotte for select to authenticated using (true);
create policy liga_transaksies_lees on public.liga_transaksies for select to authenticated using (true);
