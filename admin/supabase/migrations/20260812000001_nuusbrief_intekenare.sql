-- Buitelyn se EIE nuusbrief-lys.
-- Tot nou toe het elke "Nuusbrief"-skakel op die werf na Substack se
-- subscribe-blad gewys, wat beteken het dat die adresse aan Substack behoort
-- en nie aan Buitelyn nie. Dit is die punt waar die lys ons s'n word.
--
-- Diens-rol alleen (RLS aan, geen policies): die web skryf bediener-kant deur
-- /api/nuusbrief, sodat 'n blaaier die lys nooit kan lees of aanvul nie.
create table if not exists public.nuusbrief_intekenare (
  -- Die adres self is die sleutel: 'n tweede inskrywing van dieselfde mens is
  -- 'n botsing wat ons stil kan ignoreer, nie 'n duplikaat-ry nie.
  epos text primary key,
  bron text not null default 'tuisblad',
  -- Vir latere dubbel-opt-in: die ry bestaan sodra iemand druk, maar 'n
  -- toekomstige stuur-taak stuur net na rye met 'n bevestig_at.
  bevestig_at timestamptz,
  afgemeld_at timestamptz,
  geskep_at timestamptz not null default now()
);

alter table public.nuusbrief_intekenare enable row level security;

create index if not exists nuusbrief_intekenare_geskep_idx
  on public.nuusbrief_intekenare (geskep_at desc);
