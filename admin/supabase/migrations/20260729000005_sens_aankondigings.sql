-- SENS Vertaal: JSE-aankondigings (via Sharenet se vrye SENS-blad) met
-- Gemini-klassifikasie + een Afrikaanse opsomming elk.
-- Service-role-only (RLS aan, geen policies) — web lees bediener-kant.
create table if not exists public.sens_aankondigings (
  sens_id text primary key, -- tdate+seq uit die bron
  tyd timestamptz not null,
  kode text, -- JSE-aandeelkode indien gelys (bv. NPN)
  maatskappy text not null,
  titel text not null,
  tipe text not null default 'kennisgewing',
  opsomming text,
  skakel text not null,
  geskep_at timestamptz not null default now()
);

create index if not exists sens_tyd_idx on public.sens_aankondigings (tyd desc);
create index if not exists sens_kode_idx on public.sens_aankondigings (kode);

alter table public.sens_aankondigings enable row level security;

-- Bot-kennisgewing vir eie aandele se SENS
alter table public.telegram_koppelinge
  add column if not exists sens boolean not null default true;
