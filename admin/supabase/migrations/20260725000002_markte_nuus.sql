-- Cached Afrikaans summaries of external market-news articles shown on
-- buitelyn.com/markte (written by the web app via service role; read
-- server-side only — RLS on, no policies).
create table markte_nuus (
  skakel text primary key,
  titel text not null,
  bron text not null,
  opsomming text not null,
  gepubliseer timestamptz not null,
  geskep_at timestamptz not null default now()
);
alter table markte_nuus enable row level security;
