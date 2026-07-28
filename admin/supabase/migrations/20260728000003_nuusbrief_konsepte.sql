-- Substack-skryfhulp: Gemini-gegenereerde nuusbrief-konsepte uit die
-- /markte-pyplyn (dagoorsig + nuus + kwotasies), een per dag, redigeerbaar.
create table nuusbrief_konsepte (
  id uuid primary key default gen_random_uuid(),
  datum date unique not null,
  teks text not null,
  geskep_at timestamptz not null default now(),
  opgedateer_at timestamptz not null default now()
);
alter table nuusbrief_konsepte enable row level security;
create policy nuusbrief_konsepte_allowlist on nuusbrief_konsepte
  for all to authenticated using (is_allowlisted()) with check (is_allowlisted());
