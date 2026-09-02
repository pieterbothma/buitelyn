-- Winkel: produkte, variante (kleur+voorraad), bestellings.
-- RLS-beleid: produkte/variante is publiek leesbaar (die winkelblad het dit
-- nodig); bestellings het GEEN policies nie — /markte se publieke gebruikers
-- deel hierdie Supabase, so "authenticated" is NIE vertroud nie. Net die
-- service role lees/skryf bestellings.
create table winkel_produkte (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  beskrywing text not null default '',
  prys_sent integer not null check (prys_sent > 0),
  aktief boolean not null default true,
  geskep_op timestamptz not null default now()
);
create table winkel_variante (
  id uuid primary key default gen_random_uuid(),
  produk_id uuid not null references winkel_produkte(id),
  kleur text not null,
  voorraad integer not null default 0 check (voorraad >= 0),
  fotos jsonb not null default '[]'
);
create table winkel_bestellings (
  id uuid primary key default gen_random_uuid(),
  verwysing text not null unique,
  status text not null default 'begin' check (status in ('begin','betaal','gestuur')),
  modus text not null default 'toets' check (modus in ('toets','regte')),
  variant_id uuid not null references winkel_variante(id),
  item jsonb not null,          -- momentopname {naam, kleur, prys_sent, aantal}
  koper jsonb not null,         -- {naam, van, epos, selfoon}
  adres jsonb not null,         -- {straat, woonbuurt, stad, provinsie, poskode, nota}
  item_sent integer not null,
  versending_sent integer not null,
  totaal_sent integer not null,
  betaal_op timestamptz,
  geskep_op timestamptz not null default now()
);
alter table winkel_produkte enable row level security;
alter table winkel_variante enable row level security;
alter table winkel_bestellings enable row level security;
create policy "produkte publiek leesbaar" on winkel_produkte for select using (true);
create policy "variante publiek leesbaar" on winkel_variante for select using (true);
-- winkel_bestellings: doelbewus GEEN policies nie.

-- Atomies: begin -> betaal, voorraad af. Idempotent: 'n tweede oproep vir
-- dieselfde verwysing kry klaar_verwerk=true en verander niks — Paystack
-- herprobeer webhooks, en 'n dubbele e-pos is 'n fout.
create or replace function winkel_betaal(p_verwysing text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b winkel_bestellings;
begin
  update winkel_bestellings set status='betaal', betaal_op=now()
    where verwysing=p_verwysing and status='begin'
    returning * into b;
  if b.id is null then
    return jsonb_build_object('klaar_verwerk', true);
  end if;
  update winkel_variante set voorraad = greatest(0, voorraad - (b.item->>'aantal')::int)
    where id = b.variant_id;
  return jsonb_build_object('klaar_verwerk', false, 'bestelling', to_jsonb(b));
end $$;
revoke execute on function winkel_betaal(text) from public, anon, authenticated;
grant execute on function winkel_betaal(text) to service_role;

-- Saad: die Seepunt-pet. VOORRAAD IS 'N PLEKHOUER (10) — regte telling per
-- kleur kom van AP voor go-live.
insert into winkel_produkte (naam, beskrywing, prys_sent) values
  ('Seepunt-pet', 'Geborduurde Seepunt-pet, verstelbaar, een grootte.', 25000);
insert into winkel_variante (produk_id, kleur, voorraad)
  select id, k, 10 from winkel_produkte, unnest(array['Kakie','Seegroen','Houtskool']) k;
