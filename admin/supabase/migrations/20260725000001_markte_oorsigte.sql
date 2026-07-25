-- Daily AI market summaries for buitelyn.com/markte (written by the web
-- app's cron via service role; read server-side only — RLS on, no policies).
create table markte_oorsigte (
  id uuid primary key default gen_random_uuid(),
  datum date unique not null,
  teks text not null,
  geskep_at timestamptz not null default now()
);
alter table markte_oorsigte enable row level security;
