-- Raw news items pushed by the local scraper on Piet's Mac for sources whose
-- bot protection blocks Vercel's IPs (Daily Investor). The web app merges
-- these with its own live RSS fetches; translation/caching stays in
-- markte_nuus. Service role only — RLS on, no policies.
create table markte_nuus_rou (
  skakel text primary key,
  titel text not null,
  bron text not null,
  beskrywing text not null default '',
  gepubliseer timestamptz not null,
  geskep_at timestamptz not null default now()
);
alter table markte_nuus_rou enable row level security;
