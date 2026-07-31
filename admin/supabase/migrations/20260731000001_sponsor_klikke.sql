-- Klikke deur na 'n borg (EasyEquities). Bediener-kant gelog sodat
-- advertensieblokkers die telling nie kan onderdruk nie; dit is die syfer wat
-- Buitelyn in 'n borgskap-onderhandeling wys.
-- besoeker_hash = daagliks-roterende gesoute hash van IP+UA. Die rou IP word
-- NOOIT gestoor nie (POPIA).
create table if not exists public.sponsor_klikke (
  id bigserial primary key,
  sponsor text not null,
  gids text not null,
  plek text not null check (plek in ('inlyn', 'voetkaart')),
  besoeker_hash text not null,
  verwysing text,             -- net die gasheer, nooit die volle URL
  geskep_at timestamptz not null default now()
);

create index if not exists sponsor_klikke_geskep_idx on public.sponsor_klikke (geskep_at desc);
create index if not exists sponsor_klikke_gids_idx on public.sponsor_klikke (gids);
-- dra die 30s-ontdubbeling
create index if not exists sponsor_klikke_dedupe_idx
  on public.sponsor_klikke (besoeker_hash, gids, geskep_at desc);

-- Service-only: die web-app skryf met die service-sleutel, die Studio lees met dit.
alter table public.sponsor_klikke enable row level security;
