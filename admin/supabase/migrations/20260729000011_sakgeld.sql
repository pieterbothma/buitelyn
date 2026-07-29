-- Sakgeld-bord: die huishoudelike syfers (repo, prima, inflasie, petrol).
-- Service-only; web lees bediener-kant.
create table if not exists public.sakgeld_syfers (
  sleutel text primary key,
  naam text not null,
  waarde numeric not null,
  eenheid text not null default '%',
  datum_effektief text,
  bron text,
  bygewerk timestamptz not null default now()
);

alter table public.sakgeld_syfers enable row level security;
