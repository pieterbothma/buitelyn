-- Mandjie: 'n bestelling dra nou 'n LYS items; variante kry grootte en 'n
-- versteek-vlag; produkte kry slug en fotos (die winkel lees NET produkte.fotos).
alter table winkel_produkte
  add column slug text,
  add column fotos jsonb not null default '[]';
update winkel_produkte set slug = 'seepunt-pet' where naam = 'Seepunt-pet';
update winkel_produkte set fotos = '["/winkel/pet-af871d.jpg","/winkel/pet-24c6ee.jpg","/winkel/pet-8bf0de.jpg","/winkel/pet-e50849.jpg","/winkel/pet-9398f3.jpg","/winkel/pet-d9952d.jpg"]'
  where slug = 'seepunt-pet';
alter table winkel_produkte alter column slug set not null;
alter table winkel_produkte add constraint winkel_produkte_slug_uniek unique (slug);

alter table winkel_variante
  add column grootte text,
  add column aktief boolean not null default true,
  drop column fotos;  -- nooit gelees nie; produkte.fotos is die galery
alter table winkel_variante add constraint winkel_variante_kombinasie_uniek
  unique nulls not distinct (produk_id, kleur, grootte);

-- Bestellings: item+variant_id word items (lys). Die bestaande rye word omgeskakel.
alter table winkel_bestellings add column items jsonb;
update winkel_bestellings set items = jsonb_build_array(
  item || jsonb_build_object('variant_id', variant_id, 'grootte', null));
alter table winkel_bestellings alter column items set not null;
alter table winkel_bestellings drop column item, drop column variant_id;

-- winkel_betaal v2: trek ELKE lyn se voorraad af. Selfde idempotensie-kontrak.
create or replace function winkel_betaal(p_verwysing text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b winkel_bestellings; lyn jsonb;
begin
  update winkel_bestellings set status='betaal', betaal_op=now()
    where verwysing=p_verwysing and status='begin'
    returning * into b;
  if b.id is null then
    return jsonb_build_object('klaar_verwerk', true);
  end if;
  for lyn in select * from jsonb_array_elements(b.items) loop
    update winkel_variante
      set voorraad = greatest(0, voorraad - (lyn->>'aantal')::int)
      where id = (lyn->>'variant_id')::uuid;
  end loop;
  return jsonb_build_object('klaar_verwerk', false, 'bestelling', to_jsonb(b));
end $$;
revoke execute on function winkel_betaal(text) from public, anon, authenticated;
grant execute on function winkel_betaal(text) to service_role;

-- Berging: openbare lees, skryf NET via service role (HQ se aksies).
insert into storage.buckets (id, name, public) values ('winkel-fotos','winkel-fotos', true)
  on conflict (id) do nothing;
create policy "winkel-fotos publiek leesbaar" on storage.objects
  for select using (bucket_id = 'winkel-fotos');

-- Saad: vier Buitelyn-produkte, VERSTEEK, plekhouer-pryse, voorraad 0.
-- AP flip aktief en vul voorraad in HQ wanneer sy plaaslike voorraad eg is.
with p as (
  insert into winkel_produkte (naam, beskrywing, prys_sent, aktief, slug) values
    ('Buitelyn-koffiebeker', 'PLEKHOUER-beskrywing en -prys — AP bevestig.', 19900, false, 'buitelyn-koffiebeker'),
    ('Buitelyn-keps',        'PLEKHOUER-beskrywing en -prys — AP bevestig.', 29900, false, 'buitelyn-keps'),
    ('Buitelyn-trui',        'PLEKHOUER-beskrywing en -prys — AP bevestig.', 59900, false, 'buitelyn-trui'),
    ('Buitelyn-hemp',        'PLEKHOUER-beskrywing en -prys — AP bevestig.', 44900, false, 'buitelyn-hemp')
  returning id, slug)
insert into winkel_variante (produk_id, kleur, grootte, voorraad)
select id, k.kleur, g.grootte, 0 from p
cross join lateral (values ('Swart'),('Wit')) as k(kleur)
cross join lateral (
  select unnest(array['S','M','L','XL','XXL']) as grootte
  where p.slug in ('buitelyn-trui','buitelyn-hemp')
  union all select null where p.slug in ('buitelyn-koffiebeker','buitelyn-keps')
) as g;
