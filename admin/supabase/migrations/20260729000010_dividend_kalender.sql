-- Dividend-kalender: gestruktureerde datums/bedrae wat Gemini uit
-- SENS-dividend-aankondigings onttrek. Service-only (web lees bediener-kant).
create table if not exists public.dividend_kalender (
  sens_id text primary key references public.sens_aankondigings (sens_id) on delete cascade,
  kode text not null,
  maatskappy text not null,
  bedrag_sent numeric, -- sent per aandeel (ZAc)
  ldt date,            -- laaste dag om te verhandel (cum div)
  betaaldatum date,
  geskep_at timestamptz not null default now()
);

create index if not exists dividend_kalender_ldt_idx on public.dividend_kalender (ldt);

alter table public.dividend_kalender enable row level security;
