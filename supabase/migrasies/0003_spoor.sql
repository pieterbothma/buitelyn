-- Spoor: die gestuur-stap dra nou 'n koerier en spoornommer, en stuur 'n e-pos.
alter table winkel_bestellings
  add column koerier text,
  add column spoornommer text;
