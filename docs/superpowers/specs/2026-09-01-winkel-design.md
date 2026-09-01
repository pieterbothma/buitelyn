# Buitelyn Winkel — ontwerp (2026-09-01)

Eenvoudige e-handel by buitelyn.com/winkel: AP se Seepunt-pette (tans die enigste
produk, R250, drie kleure op yaga.co.za/andre-pierre), Paystack-betaling, volle
adres-insameling, POPIA/ECTA-nakoming. Eers end-tot-end getoets op 'n
tak-voorskou; produksie kry eers die winkel wanneer Piet en AP dit deurgeklik het.

## Besluite (Piet, 2026-09-01)

| Vraag | Besluit |
|---|---|
| Versending | Vaste koerierfooi **R99** landwyd |
| Rekening | **Gaskoopvloei** — geen registrasie; e-pos vooraf ingevul as ingeteken |
| Kennisgewings | E-pos aan koper (bevestiging) + AP + Piet (`BESTELLING_EPOSTE`) |
| Katalogus | **Klein raam**: produkte + variante in Supabase; volgende produk = 'n ry |
| Toets | Tak `winkel` se voorskou-URL; toets-sleutels as Preview env in Vercel |

## Roetes (alles binne web/)

| Roete | Wat |
|---|---|
| `/winkel` | Produkblad = winkelblad. Kleurkeuse, hoeveelheid, adresvorm, POPIA-lyn |
| `/winkel/bevestig` | Ná-betaling; bedien-kant verify teen Paystack; wys uitslag |
| `/api/winkel/tjek` | POST: valideer, voorraad-kontrole, skryf bestelling (`begin`), Paystack initialize, stuur `authorization_url` terug |
| `/api/winkel/paystack` | Webhook. HMAC-SHA512 geverifieer. `charge.success` → `betaal`, voorraad −1, drie e-posse. Idempotent |
| `/privaatheid` | NUUT — POPIA-blad langs die bestaande wetlik-bladsye |

## Data (bestaande Buitelyn-Supabase, migrasies in supabase/)

- **winkel_produkte**: id, naam, beskrywing, prys_sent, aktief
- **winkel_variante**: produk_id, kleur, voorraad, fotos (jsonb)
- **winkel_bestellings**: id, verwysing (Paystack reference), status
  (`begin`→`betaal`→`gestuur`), item-momentopname (naam/kleur/prys_sent/aantal),
  koper (naam, van, epos, selfoon), adres (straat, woonbuurt, stad, provinsie,
  poskode, nota), totaal_sent, versending_sent, betaal_op, geskep_op
- RLS: geen publieke lees/skryf nie; net die service role. Produkte/variante:
  publieke lees, geen skryf.

## Betaalvloei — die webhook is die waarheid

1. `/api/winkel/tjek` skryf die bestelling met status `begin` en roep Paystack
   `transaction/initialize` (bedrag in **sent**, ZAR, `callback_url`, `reference`
   = ons verwysing, metadata = items+adres).
2. Koper betaal op Paystack se blad.
3. Webhook `charge.success`: verifieer handtekening, verifieer **bedrag teen ons
   bestelling**, status → `betaal`, voorraad −1 (atomies), e-posse uit.
   Idempotent — Paystack herprobeer.
4. `/winkel/bevestig` doen 'n bedien-kant verify vir die UX; dit skryf niks.
5. Voorraad: kontrole by tjek (eerlike "uitverkoop"-fout), aftrek by betaling.
   Verlate `begin`-bestellings hou nooit voorraad vas nie.

## E-posse (Resend, bestellings@buitelyn.com — domein reeds geverifieer)

- **Koper**: bestelnommer, item+kleur+aantal, R250+R99=R349-uiteensetting, die
  afleweringsadres soos ingetik, "5 tot 7 werksdae" (uit wetlik.ts), 7-dae
  afkoelreg met skakels na /kansellasie en /terugbetalings, Promenader-identiteit
  in die voetskrif (ECTA art. 43 geld ook vir die e-pos).
- **AP + Piet** (`BESTELLING_EPOSTE` env): volle bestelling + adres, gereed om te
  stuur. AP se adres NOG NODIG van Piet.
- "Gestuur"-e-pos: DOELBEWUS uitgestel; AP hanteer dit eers per hand.

## POPIA & ECTA

- `/privaatheid`: wat ons insamel (naam, kontak, adres), hoekom (aflewering +
  belasting), hoe lank, met wie gedeel (Paystack, koerier), regte, kontak.
- Toestemming-lyn by die vorm met skakel; geen versteekte opt-ins nie.
- Bestaande wetlik-bladsye en wetlik.ts bly die enkele bron van feite.

## Toetsplan (op die voorskou, vóór enige produksie)

Paystack toets-URL's (reeds aan Piet gegee, dashboard → Test):
- Callback: `https://buitelyn-git-winkel-piets-projects-799b105d.vercel.app/winkel/bevestig`
- Webhook: `https://buitelyn-git-winkel-piets-projects-799b105d.vercel.app/api/winkel/paystack`

1. Toetskaart-koop end-tot-end: kies → vorm → betaal → webhook → voorraad −1 →
   3 e-posse → bevestig-blad korrek.
2. Geweierde kaart: bestelling bly `begin`, geen voorraad-verandering, geen e-pos.
3. Webhook-herspeel: geen dubbele aftrek of dubbele e-pos nie.
4. Laaste-item-wedloop: tweede koper kry "uitverkoop", nie 'n oorverkoop nie.
5. Vorm-validasie: poskode, selfoon, verpligte velde.
Produksie: merge na main, Live-sleutels in Vercel env, Live webhook/callback op
buitelyn.com, een regte R1-toets... nee — Paystack Live minimum is 'n regte koop;
AP koop sy eie pet as die eerste bestelling.

## Buite bestek (doelbewus)

Geen mandjie (een produk; hoeveelheid-kieser), geen koper-rekeninge, geen
admin-UI (voorraad via Supabase-dashboard), geen Yaga-invoer-masjinerie, geen
gestuur-e-pos-outomasie.

## Oop feite

- AP se bestelling-e-posadres (env-plekhouer tot dan)
- Werklike voorraad per kleur (Kakie / Seegroen / Houtskool)
