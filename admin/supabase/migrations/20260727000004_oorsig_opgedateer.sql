-- Uurlikse dagoorsig: wys wanneer laas bygewerk.
alter table markte_oorsigte add column opgedateer_at timestamptz not null default now();
