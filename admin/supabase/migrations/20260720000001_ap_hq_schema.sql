-- AP HQ schema — single-user workspace dashboard
-- All tables carry RLS locked to the allowlisted user (AP); service role bypasses.

create extension if not exists "pgcrypto";

-- ── Core: workspaces & formats ────────────────────────────────────────────
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  naam text not null,
  accent text not null default '#F03028',
  invoice_prefix text not null,
  skool_url text,
  posisie int not null default 0
);

create table formats (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  naam text not null
);

-- ── Pipeline ──────────────────────────────────────────────────────────────
create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  format_id uuid references formats(id) on delete set null,
  naam text not null,
  -- days: array of ISO weekday numbers 1=Ma … 7=So
  weekdae int[] not null,
  tyd time not null default '09:00',
  aktief boolean not null default true
);

create type card_status as enum ('beplan','produksie','gereed','gepubliseer','gemis');

create table cards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  format_id uuid references formats(id) on delete set null,
  rule_id uuid references recurring_rules(id) on delete set null,
  titel text not null,
  status card_status not null default 'beplan',
  due_at timestamptz not null,
  idea_id uuid,
  notas text,
  geskep_at timestamptz not null default now(),
  unique (rule_id, due_at)
);
create index cards_due_idx on cards (due_at);
create index cards_ws_status_idx on cards (workspace_id, status);

-- ── Idees ─────────────────────────────────────────────────────────────────
create type idea_bron as enum ('in_app','telegram_stem','telegram_teks');

create table ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete set null, -- null = Inkassie
  format_id uuid references formats(id) on delete set null,
  titel text not null,
  nota text,
  skakel text,
  bron idea_bron not null default 'in_app',
  voicenote_path text,
  geskep_at timestamptz not null default now()
);
create index ideas_ws_idx on ideas (workspace_id, geskep_at desc);

alter table cards add constraint cards_idea_fk foreign key (idea_id) references ideas(id) on delete set null;

-- ── Kliënte & fakture ─────────────────────────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  naam text not null,
  epos text,
  kontak text,
  adres text,
  geskep_at timestamptz not null default now()
);

create type invoice_status as enum ('konsep','gestuur','betaal');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  nommer text unique not null,
  status invoice_status not null default 'konsep',
  uitgereik_op date not null default current_date,
  betaal_op date,
  notas text,
  pdf_path text,
  geskep_at timestamptz not null default now()
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  beskrywing text not null,
  aantal numeric not null default 1,
  eenheidsprys_sent bigint not null,
  posisie int not null default 0
);

-- per-entity sequence tracking
create table invoice_counters (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  jaar int not null,
  volgende int not null default 1
);

-- ── Stories (Promenader) ─────────────────────────────────────────────────
create type story_status as enum ('nuut','oorweeg','produksie','afgehandel','afgekeur');

create table stories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  titel text not null,
  bron_naam text,
  bron_kontak text,
  notas text,
  status story_status not null default 'nuut',
  geskep_at timestamptz not null default now()
);

create table story_files (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  path text not null,
  naam text not null
);

-- ── Nuusbrief → Oudio ────────────────────────────────────────────────────
create table audio_episodes (
  id uuid primary key default gen_random_uuid(),
  bron_url text,
  titel text not null,
  teks text not null,
  voice_id text not null,
  mp3_path text,
  geskep_at timestamptz not null default now()
);

-- ── Entity settings & Telegram ───────────────────────────────────────────
create table entity_settings (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  bank_besonderhede text,
  faktuur_epos_from text,
  logo_path text
);

create table telegram_state (
  chat_id bigint primary key,
  pending_action jsonb,
  updated_at timestamptz not null default now()
);

-- ── RLS: single allowlisted user ─────────────────────────────────────────
-- The allowlisted email is stored in a config table so policies read one row.
create table app_config (
  id boolean primary key default true check (id),
  allowlisted_email text not null
);
insert into app_config (allowlisted_email) values ('CHANGE_ME@example.com');

create or replace function is_allowlisted() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (auth.jwt() ->> 'email') = allowlisted_email from app_config),
    false
  );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','formats','recurring_rules','cards','ideas','clients',
    'invoices','invoice_lines','invoice_counters','stories','story_files',
    'audio_episodes','entity_settings','telegram_state','app_config'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using (is_allowlisted()) with check (is_allowlisted())',
      t || '_allowlist', t
    );
  end loop;
end $$;

-- ── Seed: workspaces, formats, rules ─────────────────────────────────────
insert into workspaces (slug, naam, accent, invoice_prefix, posisie) values
  ('buitelyn',   'Buitelyn',                    '#F03028', 'BUI',  0),
  ('ei-aai',     'Ei-Aai',                      '#0E8345', 'EIA',  1),
  ('tweede-trump','Die Tweede Trump',           '#E8720C', 'TWT',  2),
  ('afna',       'African Future News Academy', '#1D4ED8', 'AFNA', 3),
  ('promenader', 'Promenader',                  '#6D28D9', 'PRO',  4);

insert into formats (workspace_id, naam)
select id, f from workspaces w
cross join lateral (values ('Nuusbrief'), ('YouTube-show')) as fmt(f)
where w.slug = 'buitelyn';

insert into recurring_rules (workspace_id, format_id, naam, weekdae, tyd)
select w.id, f.id, 'Buitelyn Nuusbrief', array[1,2,3,4,5], '09:00'
from workspaces w join formats f on f.workspace_id = w.id and f.naam = 'Nuusbrief'
where w.slug = 'buitelyn';

insert into recurring_rules (workspace_id, format_id, naam, weekdae, tyd)
select w.id, f.id, 'Buitelyn YouTube-show', array[1,2,3,4,5], '12:00'
from workspaces w join formats f on f.workspace_id = w.id and f.naam = 'YouTube-show'
where w.slug = 'buitelyn';

insert into recurring_rules (workspace_id, naam, weekdae, tyd)
select id, 'Ei-Aai episode', array[1], '09:00' from workspaces where slug = 'ei-aai';

insert into recurring_rules (workspace_id, naam, weekdae, tyd)
select id, 'Die Tweede Trump episode', array[5], '09:00' from workspaces where slug = 'tweede-trump';
