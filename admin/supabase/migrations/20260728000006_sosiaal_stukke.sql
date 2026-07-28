-- Poskaart-stukke uit die opgelaaide (finale) nuusbrief: kop + kort
-- opsomming per storie, een stel per dag.
create table sosiaal_stukke (
  id uuid primary key default gen_random_uuid(),
  datum date unique not null,
  stukke jsonb not null,
  geskep_at timestamptz not null default now()
);
alter table sosiaal_stukke enable row level security;
create policy sosiaal_stukke_allowlist on sosiaal_stukke
  for all to authenticated using (is_allowlisted()) with check (is_allowlisted());
