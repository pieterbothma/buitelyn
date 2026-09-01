# Winkel-mandjie en Produkte-bestuur — ontwerp (2026-09-01)

Bou voort op die winkel-tak (ongemerge). Die winkel groei van een produk met
direkte betaling na 'n katalogus met 'n mandjie, en AP HQ kry produkte-bestuur.
Die Paystack-vloei, webhook-as-waarheid, toegangslys en wetlik-lae bly presies
soos gebou.

## Besluite (Piet, 2026-09-01)

| Vraag | Besluit |
|---|---|
| Fourthwall-produkte (beker, keps, trui, hemp) | Kom op ONS winkel; AP kry plaaslike voorraad en stuur self |
| TopBar "Winkel"-skakel | BLY op Fourthwall; /winkel leef via voetskrif + direkte URL |
| Versending | R99 plat per bestelling, ongeag items |
| Groottes (trui, hemp) | S / M / L / XL / XXL |
| Lansering nuwe produkte | Gesaai versteek (aktief=false), plekhouer-pryse; AP flip lewendig wanneer voorraad+prys eg is |
| HQ | Volle produkte-bestuur: skep, wysig, fotos oplaai, variante (kleur×grootte) byvoeg, voorraad redigeer, versteek — GEEN uitvee nie |

## Databasis (migrasie 0002)

- `winkel_produkte` + `slug text unique not null`, `fotos jsonb not null default '[]'`
  (lys URL-strings; die winkel lees NET hierdie veld — geen hardgekodeerde foto's
  meer nie).
- `winkel_variante` + `grootte text` (null vir grootteloos, bv. die pet en beker),
  + `aktief boolean not null default true` (versteek sonder uitvee),
  unique(produk_id, kleur, grootte). Bestaande `fotos`-kolom op variante val weg
  (nooit gelees nie).
- `winkel_bestellings`: `item jsonb` + `variant_id` word `items jsonb` — 'n LYS
  van {variant_id, naam, kleur, grootte, prys_sent, aantal}. Die bestaande
  toets-ry word omgeskakel in die migrasie.
- `winkel_betaal(p_verwysing)` v2: loop oor items en trek elke variant se
  voorraad af, steeds EEN atomiese, idempotente oproep; selfde jsonb-kontrak.
- Berging: openbare bucket `winkel-fotos`; oplaai NET via HQ se bedien-kant
  aksies (service role). `next/image` remote pattern vir die storage-domein in
  albei apps se config waar nodig.
- Saad: Seepunt-pet kry slug + sy ses foto's in produkte.fotos; vier
  Buitelyn-produkte (koffiebeker, keps, trui, hemp) aktief=false met
  plekhouer-pryse (gemerk in beskrywing as PLEKHOUER), Fourthwall-fotos as
  plekhouers; trui/hemp variante oor S-XXL per kleur, keps/beker grootte null.
  Alle nuwe variante voorraad 0 — AP vul werklike tellings in HQ.

## Winkel-bladsye (web/)

- `/winkel`: produk-ROOSTER — net produkte met aktief=true én ≥1 aktiewe
  variant. Kaart: eerste foto, naam, prys. Mandjie-kentekens (item-telling) op
  winkel-bladsye; die werf se TopBar bly andersins onaangeraak.
- `/winkel/[slug]`: galery (produk.fotos), kleur-kieser, grootte-kieser (net as
  die produk groottes het; uitverkoopte kombinasies gedeaktiveer met
  "Uitverkoop"), hoeveelheid 1-5, "Voeg by mandjie". Voeg-aksie wys 'n
  bevestiging met skakels "Gaan na mandjie" / "Koop verder".
- Mandjie: localStorage `{variantId, aantal}[]` — geen DB-mandjie nie. Die
  bediener hervalideer en herprys in elk geval alles by tjek.
- `/winkel/mandjie`: lynitems (foto, naam, kleur/grootte, prys), hoeveelheid
  verstel, verwyder, totaal + R99, "Gaan betaal". Voorraad-veranderinge sedert
  byvoeging wys eerlik ("nog net 2 oor") by hervalidasie.
- `/winkel/betaal`: die afleweringsvorm soos gebou (labels, autocomplete,
  POPIA-lyn), plus 'n bestelling-opsomming. POST na tjek met items[].
- `/winkel/bevestig`: onveranderd.

## API

- `/api/winkel/tjek`: aanvaar items[] (1-20 lyne, aantal 1-5 per lyn),
  valideer ELKE lyn teen DB (bestaan, aktief, voorraad), prys ALLES
  bedien-kant, skryf bestelling met items-lys. Voorraadfout per lyn:
  {fout, variantId} sodat die mandjie die skuldige lyn kan merk.
- `/api/winkel/paystack`: onveranderd behalwe winkel_betaal v2 se kontrak.
- E-posse: lynitem-lyste in koper- én eienaar-e-pos; [TOETS]-merker bly.

## AP HQ

- `/bestellings`: items-lys per bestelling (naam, kleur/grootte, aantal);
  voorraad-strook word 'n per-produk opsomming met skakel na /produkte.
- `/produkte` (NUUT, agter toegangslys):
  - Lys: alle produkte (aktief én versteek), toggle per produk.
  - Redigeer: naam, beskrywing, prys in RAND (gestoor as sent), slug
    outo-afgelei maar redigeerbaar; fotos oplaai (Storage) + herrangskik +
    verwyder uit die lys.
  - Variant-rooster: kleur × grootte matriks, voorraad direk redigeerbaar,
    0 = uitverkoop; voeg kleur by (skep oor die produk se groottes), voeg
    grootte by, versteek variant. GEEN uitvee nie — bestellings verwys.
  - Nuwe produk: besonderhede + fotos + variante; verskyn op die winkel eers
    ná die aktief-toggle.
- Alle skryf-aksies: bedien-kant, service role, toegelaat()-gehek soos
  merkGestuur.

## Buite bestek

Geen DB-mandjie, geen koper-rekeninge, geen afslagkodes, geen
Fourthwall-API-integrasie, geen produk-uitvee, geen gestuur-e-pos-outomasie.

## Toets (op dieselfde voorskou)

Mandjie-vloei end-tot-end met toetskaart; multi-item webhook (2 verskillende
variante in een bestelling → albei voorraad -1, een e-pos met twee lyne);
herspeel-idempotensie; uitverkoop-lyn by tjek; HQ: produk skep → foto oplaai →
variante → aktief-toggle → verskyn op winkel; voorraad-redigeer weerspieël
onmiddellik. Piet se oop items (Paystack-webhook-URL, eie koop, HQ-aanmelding)
bly geldig op dieselfde tak.
