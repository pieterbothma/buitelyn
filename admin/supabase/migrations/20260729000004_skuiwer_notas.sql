-- "Hoekom beweeg dit?"-notas: een KI-paragraaf per JSE-skuiwer per dag,
-- geskryf deur die markte-agent wanneer 'n aandeel ±3% beweeg.
-- Service-role-only (RLS aan, geen policies) — die web lees bediener-kant.
create table if not exists public.skuiwer_notas (
  datum date not null,
  simbool text not null,
  delta_persent numeric not null,
  nota text not null,
  geskep_at timestamptz not null default now(),
  primary key (datum, simbool)
);

alter table public.skuiwer_notas enable row level security;
