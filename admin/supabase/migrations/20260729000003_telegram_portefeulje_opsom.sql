-- Aand-portefeulje-opsomming (19:00 SAST) — af/aan per gekoppelde gebruiker.
-- Verstek aan: die cron stuur in elk geval net vir gebruikers mét houdings.
alter table public.telegram_koppelinge
  add column if not exists portefeulje boolean not null default true;
