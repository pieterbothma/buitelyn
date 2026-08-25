-- Die outostoor skryf 'n weergawe-snapshot vir ELKE tipe, maar die CHECK het
-- net 'oorsig' en 'konsep' toegelaat. Die oudio-skrip se snapshots is dus
-- elke 20 sekondes stilweg deur die databasis verwerp — die Supabase-kliënt
-- GOOI nie by 'n constraint-fout nie, hy gee dit terug, en die outostoor kyk
-- nie daarna nie. Die skrip self stoor reg; net die terugrol-geskiedenis was
-- leeg.
alter table public.studio_weergawes drop constraint if exists studio_weergawes_tipe_check;
alter table public.studio_weergawes
  add constraint studio_weergawes_tipe_check check (tipe in ('oorsig', 'konsep', 'oudio'));
