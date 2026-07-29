-- Studio Oorsigte: AP se oggend-oorsig (teks, later audio) — een per dag.
create table if not exists public.studio_oorsigte (
  datum date primary key,
  teks text not null,
  geskep_at timestamptz not null default now(),
  opgedateer_at timestamptz not null default now()
);

alter table public.studio_oorsigte enable row level security;

create policy studio_oorsigte_allowlist on public.studio_oorsigte
  for all to authenticated using (is_allowlisted()) with check (is_allowlisted());
