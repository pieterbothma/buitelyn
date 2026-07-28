-- Kort per-chat-geskiedenis vir @buitelynbot se vraag-antwoorde:
-- laaste beurte as jsonb, met 'n tydstempel vir die varsheidsvenster.
alter table public.telegram_koppelinge
  add column if not exists gesprek jsonb not null default '[]'::jsonb,
  add column if not exists gesprek_at timestamptz;
