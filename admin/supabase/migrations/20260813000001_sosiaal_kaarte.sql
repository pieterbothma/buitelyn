-- Gebruiker-saamgestelde sosiale kaarte: veelvuldige kaarte per dag, elk met sy
-- eie styl en spesifikasie.
--
-- Apart van sosiaal_stukke, en met opset. Daai tabel is AFGELEI uit die dag se
-- nuusbrief, het datum unique, en voer die outomatiese poskaarte én die
-- audiogram — dit sou verkeerd wees om dit te verbreed net om handgemaakte
-- kaarte te stoor.
--
-- Die spek is die bron van waarheid: die PNG word altyd daaruit herrender, so
-- 'n kaart bly weke later nog redigeerbaar, en kan selfs in 'n ander vorm
-- herrender word met die snit behoue.
create table if not exists public.sosiaal_kaarte (
  id uuid primary key default gen_random_uuid(),
  datum date not null,
  titel text,
  styl text not null check (styl in ('kop-beeld', 'groot-getal', 'aanhaling', 'lys')),
  vorm text not null default 'vierkant'
    check (vorm in ('vierkant', 'portret', 'storie', 'landskap')),
  spek jsonb not null,
  -- png_url is 'n KAS, nie die waarheid nie. Elke stoor skryf 'n NUWE
  -- tydstempel-pad; paaie word nooit oorskryf nie, want Supabase bedien
  -- publieke voorwerpe met 'n max-age en Buffer sou 'n ou beeld kry.
  png_pad text,
  png_url text,
  posisie int not null default 0,
  geskep_at timestamptz not null default now(),
  opgedateer_at timestamptz not null default now()
);

create index if not exists sosiaal_kaarte_datum_idx
  on public.sosiaal_kaarte (datum desc, posisie, geskep_at desc);

alter table public.sosiaal_kaarte enable row level security;

create policy sosiaal_kaarte_allowlist on public.sosiaal_kaarte
  for all to authenticated using (is_allowlisted()) with check (is_allowlisted());
