-- Outostoor-weergawes vir die Studio-redigeerders (oorsig, konsep):
-- elke outostoor/stoor los 'n snapshot; die UI kan terugrol.
create table if not exists public.studio_weergawes (
  id uuid primary key default gen_random_uuid(),
  tipe text not null check (tipe in ('oorsig', 'konsep')),
  datum date not null,
  teks text not null,
  geskep_at timestamptz not null default now()
);

create index if not exists studio_weergawes_idx on public.studio_weergawes (tipe, datum, geskep_at desc);

alter table public.studio_weergawes enable row level security;

create policy studio_weergawes_allowlist on public.studio_weergawes
  for all to authenticated using (is_allowlisted()) with check (is_allowlisted());
