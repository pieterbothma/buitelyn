# Launch-bladsye — TV-blok, Adverteer, Redaksioneel — Design

**Date:** 2026-08-16
**Status:** Approved
**Reference:** AP se e-pos "Lys van dinge voor video launch" (16 Aug 2026); tuisblad `web/app/page.tsx` (uitleg C); Substack-leser `web/lib/feed.ts`; nuus-pyplyn `web/lib/markets/nuus.ts`; migrasies in `admin/supabase/migrations/`; Resend-patroon in `admin/lib/send-invoice.ts`. Mockup: https://claude.ai/code/artifact/34d4b43a-afc9-42a1-b176-0c5b315da6b8

## Goal

Drie dinge op buitelyn.com voor die video-launch:

1. Die jongste YouTube-video wat vanself op die voorblad verskyn, onder 'n foto
   van AP. (Suzaan was oorspronklik deel van die aanbieding; sedert 2026-08-25
   is dit net AP.)
2. 'n `/adverteer`-blad wat verduidelik hóé 'n adverteerder adverteer, sonder om
   'n prys op die werf te sit.
3. 'n `/redaksioneel`-blad wat sê waar die nuus vandaan kom, dat die RSS-stories
   nie ons eiendom is nie, en waar ons AI gebruik.

## Konteks — wat reeds staan

Die tuisblad is doelbewus markte-eerste ("uitleg C", `8480c89`): PrysStrook,
Koerantkop, dan 'n twee-kolom-rooster met Dagoorsig, Bewegers, Marknuus links en
Van Buitelyn, Slot regs. Die ou Hero/Voorblad-komponente staan onaangeraak in
`components/` as terugrol-pad.

`lib/feed.ts` lees die Substack-RSS met `fast-xml-parser` en word in `page.tsx`
met `.catch()` afgevang sodat 'n stil Substack nie die markte saamvat nie.
Daardie vorm word hier presies herhaal vir YouTube.

`lib/markets/nuus.ts` trek vyf SA-strome (Business Day maatskappye + ekonomie,
Moneyweb, Daily Investor, BizNews) en laat Gemini 'n Afrikaanse opskrif, 'n
±18-woord-opsomming **in ons eie woorde** en twee vervolgvrae skryf. Die web-app
skryf na die AP-HQ-Supabase met `APHQ_SUPABASE_SERVICE_KEY` (dienssleutel,
slegs bediener-kant).

## Decisions

- **Die TV-blok kom bý, dit vervang niks.** Die foto en video sit bo-aan
  `<main>`; die hele bestaande rooster loop onveranderd daaronder. Uitleg C bly
  staan.
- **YouTube kom uit die kanaal se RSS**, nie die Data API nie: geen sleutel,
  geen kwota, en dieselfde parser wat reeds in die repo is.
- **Die speler is 'n fasade.** Ons wys YouTube se duimnael met 'n speelknoppie
  en ruil dit eers op 'n klik vir die `youtube-nocookie.com`-raam uit. Anders
  laai elke tuisblad-besoek ±1 MB Google-JS wat die meeste besoekers nooit
  gebruik nie.
- **Die foto is een konstante.** Vrydag se skoot is 'n een-lêer-verandering.
  Ons bou nou met 'n plekhouer sodat niks op die foto wag nie.
- **Adverteer-navrae gaan eers in Supabase, dan per e-pos uit.** 'n
  Resend-onderbreking of 'n gemorspos-vouer moet nie 'n leidraad kan verloor
  nie.
- **Geen prys op die blad nie.** Die blad verduidelik die meganisme; die
  koerskaart gaan per e-pos uit. So bly die blad reg wanneer die pryse verander.
- **Die redaksionele kopie beskryf wat die kode werklik doen.** AP se e-pos sê
  "net die 1e sin van elke storie word vertaal"; die kode doen dit nie. Dit
  vertaal die opskrif en skryf ons eie een-sin-opsomming, en raak nooit aan die
  artikel se teks nie. Ons skryf laasgenoemde neer — dit is die ware stelling en
  ook die sterker outeursreg-posisie. AP is hiervan ingelig en akkoord.
- **Navigasie:** ADVERTEER by die koerantkop (waar 'n borg soek); "Redaksioneel
  & AI" in die voetstuk (waar lesers en Google 'n vrywaring soek).

## Argitektuur

### 1. Die TV-blok

| Lêer | Rol |
|---|---|
| `web/lib/youtube.ts` | `getNuutsteVideo(): Promise<Video \| null>` — haal `https://www.youtube.com/feeds/videos.xml?channel_id=…`, ontleed met `fast-xml-parser`, gee `{ id, titel, gepubliseer, duimnael }` van `entry[0]`. `next: { revalidate: 600 }` op die fetch. |
| `web/lib/__fixtures__/youtube-feed.xml` | Gestoorde regte antwoord vir die toets. |
| `web/components/tuisblad/tv-blok.tsx` | Bediener-komponent: foto links, video regs (een stapel op 'n foon, foto bo). |
| `web/components/tuisblad/video-speler.tsx` | Kliënt-komponent: duimnael + speelknoppie, ruil op klik vir die `<iframe>`. |
| `web/app/page.tsx` | Een `getNuutsteVideo().catch(() => null)` by die bestaande `Promise.all`, en `<TvBlok>` bo die rooster. |

Die kanaal-ID kom uit `YT_KANAAL_ID` — sonder `NEXT_PUBLIC_`, want die haal
gebeur net op die bediener en 'n publieke veranderlike beland onnodig in die
kliënt-bundel. Die foto-pad is 'n konstante in `tv-blok.tsx`.

### 2. `/adverteer`

| Lêer | Rol |
|---|---|
| `web/app/adverteer/page.tsx` | Bediener-blad. Bereken die eersvolgende oop maand uit die 15de-reël en gee dit as `prop` aan die vorm. |
| `web/lib/adverteer.ts` | `volgendeOopMaand(nou: Date): { waarde: string; naam: string }[]` — suiwer funksie, toetsbaar. |
| `web/components/adverteer/vorm.tsx` | Kliënt-vorm: naam, maatskappy, e-pos, telefoon (opsioneel), maand, boodskap, plus 'n versteekte heuningpot-veld. |
| `web/app/api/adverteer/route.ts` | Valideer → `insert` in Supabase → Resend-e-pos. |
| `admin/supabase/migrations/20260816000001_advertensie_navrae.sql` | Tabel + RLS soos die res: `enable row level security` en 'n `is_allowlisted()`-beleid sodat AP dit in hq kan lees. |

Die tabel: `id uuid primary key default gen_random_uuid()`, `naam text not null`,
`maatskappy text not null`, `epos text not null`, `telefoon text`, `maand text not
null`, `boodskap text`, `geskep_at timestamptz not null default now()`. Die roete
skryf met die dienssleutel en gaan dus by RLS verby; die beleid is daar sodat AP
dit later in hq kan lees.

Die maand-verstek word op die **bediener** bereken en ingegee. Bereken 'n mens
dit in die blaaier, verskil die eerste teken van die bediener se HTML en Next
gooi 'n hydration-fout.

### 3. `/redaksioneel`

Een statiese bediener-blad, `web/app/redaksioneel/page.tsx`, geen data. Ses
afdelings: wie verantwoordelik is; die nuus van ander publikasies (die vyf
strome by die naam, wat ons neem, wat ons nooit neem nie, en 'n
verwyder-my-stroom-adres); waar ons AI gebruik; regstellings; advertensies;
markte-vrywaring. Skakel in `components/footer.tsx`.

## Data-vloei

```
YouTube RSS ──(10 min kas)──> getNuutsteVideo() ──> TvBlok ──> VideoSpeler
                                    │
                              null by fout
                                    ↓
                        foto + "Kyk op YouTube →"

Vorm ──POST──> /api/adverteer ──1──> Supabase advertensie_navrae
                                └──2──> Resend ──> AP + Piet
```

## Foutehantering

- **YouTube stil of stukkend:** `getNuutsteVideo()` gee `null`, die blok wys die
  foto met 'n gewone skakel na die kanaal. Die markte-rooster is onaangeraak.
- **Supabase-invoeging misluk:** die roete gee 500 terug en die vorm sê so; die
  gebruiker probeer weer. Ons stuur nie 'n e-pos vir 'n leidraad wat nie gestoor
  is nie.
- **Resend misluk ná 'n suksesvolle invoeging:** die roete gee stééds 200 terug.
  Die leidraad is veilig; die e-pos is 'n kennisgewing, nie die rekord nie. Die
  fout word gelog.
- **Bots:** 'n ingevulde heuningpot-veld kry 200 sonder om iets te stoor of te
  stuur.

## Toetsing

- `lib/youtube.test.ts` — ontleed die vaste XML: die jongste inskrywing eerste,
  'n leë kanaal gee `null`, wanvormige XML gooi nie op.
- `lib/adverteer.test.ts` — die 15de-reël: op die 14de is die volgende maand oop;
  op die 16de skuif dit een verder; oor 'n jaargrens ook.
- Werklike blaaier-nagaan van al drie roetes voor "klaar" (sien
  `verify-frontend-change`) — 'n skoon bou is nie bewys nie.

## Wat AP nog moet bevestig (blokkeer nie die bou nie)

Die struktuur staan; hierdie is kopie-invoere wat later ingeplak word:

1. Hoeveel borge per episode — is dit werklik een op 'n slag?
2. Lees AP die vermeldings self?
3. Wat is nou beskikbaar, en wat is reeds verkoop?
4. Kry 'n adverteerder 'n maandverslag, en wat staan daarin?
5. Suzaan se van, vir die redaksionele blad.

## Wat nodig is voor ontplooiing

- `YT_KANAAL_ID` — die YouTube-kanaal se ID (Piet).
- `RESEND_API_KEY` in die **web**-projek op Vercel. Dit staan tans net in admin.
  Die navraag-e-pos gaan uit as `noreply@buitelyn.com` — 'n geverifieerde
  Resend-domein. Nooit `onboarding@resend.dev` nie: dit lewer net aan die
  rekeninghouer af en gee 403 vir enigiemand anders.
- Twee adresse wat werklik iewers uitkom: `hallo@buitelyn.com` (verwyder-my-
  stroom) en `regstellings@buitelyn.com`. Of 'n bestaande adres in hul plek.
- Die foto van AP.

## Buite bestek

Geen episode-galery, geen kykertelling, geen selfbedienings-bespreking of
betaling, geen advertensie-vertoning op die werf self. Die video-blok wys één
video: die jongste.
