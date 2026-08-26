# Duimnaels — reaksie + AI-agtergrond + sleepbare lae — Design

**Date:** 2026-08-26
**Status:** Draft
**Reference:** Studio-rooster `admin/app/w/[slug]/studio/page.tsx`; die kaart-module `admin/lib/kaart/` (veral `spec.ts`, `beeld.ts`, `render.tsx`, `render.test.ts`); die beeldgenerering-roete `admin/app/api/fotos/skep/route.ts`; die oplaai-normalisering `admin/app/api/fotos/oplaai/route.ts`; agtergrond-verwydering `admin/app/api/beeld/agtergrond/route.ts` + `admin/lib/replicate.ts`; League Spartan-tipografie `admin/lib/kaart-render.tsx`.

## Goal

'n Nuwe Duimnael-gereedskap in Buitelyn-Studio waar AP 'n YouTube-duimnael
(1280×720) bou: kies 'n reaksie-skoot, laai verwysingsbeelde van vandag se
onderwerpe op, laat `gpt-image-2` daaruit 'n agtergrond maak, en sleep dan teks
en die logo op hulle plek.

## Konteks — wat reeds staan

Baie hiervan is klaar gebou en word hergebruik, nie herskryf nie:

- **`lib/kaart/`** is die bewese patroon: `spec.ts` hou kliënt-veilige tipes en
  afmetings; `render.tsx` en `styles/*` is BEDIENER-ALLEEN; `beeld.ts` hou die
  snit-wiskunde wat *beide* die sleep-oorlegger en satori roep.
- **`app/api/fotos/skep/route.ts`** praat reeds met `gpt-image-2` (met 'n
  `gpt-image-1`-terugval), composiet 'n logo uit `assets/logo-{ink,wit}.png`
  met sharp, en stoor na 'n Supabase-emmer.
- **`app/api/fotos/oplaai/route.ts`** normaliseer elke beeld wat die stelsel
  binnekom: EXIF reggedraai, langste kant 1600px, PNG as daar alfa is, en
  **nooit WebP nie** — satori dekodeer dit onbetroubaar en die kaart kom stil
  blank uit.
- **`app/api/beeld/agtergrond/route.ts`** verwyder reeds agtergronde via
  Replicate.
- **`assets/LeagueSpartan-700.ttf`** en `renderOpskrifPng` gee ons regte
  tipografie in plaas van AI-teks.

Wat NIE staan nie: beeldgenerering wat *verwysingsbeelde* as invoer neem.
`/v1/images/generations` is teks-alleen.

## Verifikasie wat reeds gedoen is (2026-08-26)

Alles hieronder is gemeet, nie aangeneem nie.

- `gpt-image-2` en `gpt-image-2-2026-04-21` is sigbaar op die rekening se
  `/v1/models`.
- `POST /v1/images/edits` met `model=gpt-image-2` en **meervoudige
  `image[]`-lêers** gee HTTP 200 en lewer 'n bruikbare agtergrond.
  Verbruik op `quality=low`, `size=1536x1024`: 1 648 invoer-tekens
  (1 600 daarvan beeld) en 158 uitset-tekens.
- Dieselfde roete met 'n **`mask`** hou AP se gesig prakties onveranderd en
  herteken net die gemaskerde gebied. Dít is hoe die meester reggemaak is.
- 'n Vars reaksie-stel (12 skote, `quality=high`, 7 024 uitset-tekens elk) hou
  gelykenis **beduidend beter** as Gemini se poging op dieselfde bron, en los
  terselfdertyd twee ou foute op: die hemp kom werklik skoon wit uit, en die
  mikrofoon is heel.
- `04_excited` is een keer deur die veiligheidstelsel geweier — 'n vals
  positief. 'n Herformulering ("delighted, enthusiastic") slaag eerste keer.
  Die saai-skrip moet dus 'n herformulering-terugval hê, nie net 'n herprobeer
  nie.

### Die meester was stukkend

Die oorspronklike `ap.png` het 'n wit blok van 62×47px op die RØDE-mikrofoon
gehad (x 755–816, y 634–680) — oorskiet van 'n slordige uitknipsel. Dit het
stilweg in **al** die eerste reaksie-skote oorgeplant. Dit is by die BRON
reggemaak, nie by die uitsette nie: een meester reg is elke afgeleide beeld
reg, vir altyd. Die skoon meester is `ap-master-clean.png`.

## Decisions

- **AP word as 'n vaste uitknipsel bo-op gecomposiet — die KI genereer hom nie
  by elke duimnael nie.** Wees eerlik oor die rede: `gpt-image-2` hou AP se
  gelykenis wél goed (gemeet 2026-08-26 — beter as Gemini), so dié besluit is
  nie meer 'n gelykenis-redding nie. Dit staan om drie ander redes:
    1. **Die reaksie is 'n waarborg, nie 'n wenk nie.** In die een-pas-toets is
       "shocked" as 'n slap oopmond teruggekom. Kies AP "geskok", moet hy
       geskok wees.
    2. **Herposisionering is gratis en oombliklik.** Sleep die uitknipsel en
       die voorskou beweeg; hersleep 'n gegenereerde AP en dit is 'n nuwe
       API-oproep van 30–60s.
    3. **Geen per-duimnael-lotery nie.** Een keer reg is altyd reg.
  Die koste is eerlik: AP se beligting reageer nie op die agtergrond nie. Die
  gloed-laag versag dit, want dit sit agter hom en gee die indruk van 'n
  gedeelde ligbron.
- **Die agtergrond word deur KI gemaak, uit opgelaaide verwysingsbeelde**
  (Piet se keuse), via `gpt-image-2` op `/v1/images/edits`.
- **Die reaksie-skote word met `gpt-image-2` gemaak, nie Gemini nie**
  (Piet se keuse). Gemeet op 2026-08-26: beter gelykenis, skoon wit hemp,
  heel mikrofoon.
- **Die rooi gloed agter AP is DETERMINISTIES, nie KI nie** (Piet se keuse:
  "no stars needed, just the red glow around him"). Dit is 'n inline-SVG
  radiale gradiënt tussen die agtergrond en die uitknipsel, en dit is 'n
  eienskap van die reaksie-laag — nie 'n aparte laag nie — sodat dit AP volg
  wanneer hy gesleep word. 'n Gevraagde "altyd" kan nie aan 'n model uitbestee
  word nie: 'n voorafstelling is identies elke keer, kos niks, en wys dadelik
  in die voorskou.
- **Die KI-agtergrond kry GEEN sterre nie.** Die prompt-voorafstelling vra 'n
  donker, rustige plaat; die drama kom van die gloed.
- **Die prompt is vryevorm** (Piet se keuse). 'n Buitelyn-voorafstelling word
  in die teksblok voorgelaai, maar AP kan dit heeltemal oorskryf. Die
  huisstyl leef dus in data, nie in kode nie, en verander sonder 'n ontplooiing.
- **Teks ÉN die logo is sleepbaar** (Piet se keuse). Albei is `Laag`-items met
  dieselfde `x`, `y`, `grootte`. Dit vou drie spesiale gevalle in een tipe in:
  een meetkunde-funksie, een sleep-hanteerder, een render-lus.
- **Die reaksie-biblioteek is oplaaibaar én verwyderbaar** (Piet se keuse).
  Dit is 'n emmer-lys soos `actions-kaarte.ts` reeds doen, nie 'n vasgedraade
  register nie. Die 12 skote van 2026-08-26 is saadata.
- **Geen canvas, geen gebakte pixels.** Die posisie van elke laag is drie
  getalle op die spec. Wat AP sleep is presies wat satori render, en 'n
  duimnael bly maande later herrenderbaar.
- **1536×1024 word gesny, nie geplet nie.** Die model se naaste grootte is 3:2;
  die raam is 16:9. Ons hergebruik `lib/kaart/beeld.ts` se fokus/zoem-wiskunde
  om dit nie-destruktief te sny.

## Architecture

```
lib/duimnael/
  spec.ts        KLIËNT-VEILIG — tipes, 1280×720, normalisering. Geen next/og.
  laag.ts        KLIËNT-VEILIG — die gedeelde meetkunde vir elke laag.
  render.tsx     BEDIENER-ALLEEN — satori-composiet.
components/duimnael/studio.tsx    kliënt-redigeerder + sleep-oorlegger
app/w/[slug]/duimnael/page.tsx    die blad
app/api/duimnael/agtergrond/route.ts   gpt-image-2 → emmer
app/api/duimnael/reaksie/route.ts      oplaai (POST) + verwyder (DELETE)
app/actions-duimnael.ts                lys reaksies, stoor/laai duimnaels
scripts/saai-reaksies.ts               eenmalige saad van die 12 skote
```

Die kliënt/bediener-grens is nie kosmeties nie. `lib/kaart/spec.ts` waarsku
reeds: voer 'n renderaar in 'n kliënt-komponent in, en satori + resvg +
yoga.wasm beland in die blaaier-bundel — **en die bou slaag stilweg**.
`render.tsx` word dus nooit uit `components/` ingevoer nie.

## Die vyf lae

```
1280 × 720
┌────────────────────────────────────────┐
│ 5  teks-blokke     League Spartan 700  │  sleepbaar, N blokke
│ 4  Buitelyn-logo   ink | wit | geen    │  sleepbaar
│ 3  AP-uitknipsel   uit die biblioteek  │  sleepbaar, deursigtige PNG
│ 2  rooi gloed      SVG-gradiënt        │  volg AP, deterministies
│ 1  KI-agtergrond   gpt-image-2         │  gesny met fokus/zoem
└────────────────────────────────────────┘
```

Laag 2 is nie 'n `Laag`-item nie. Dit word saam met die reaksie geteken, uit
daardie laag se `gloed`-eienskap, want 'n gloed wat nie sy mens volg nie is
net 'n kol op die agtergrond.

## Data model

`spec.ts` — kliënt-veilig, geen JSX:

```ts
export const RAAM = { w: 1280, h: 720 } as const;

/** Waar 'n laag sit. Alles 0..1 van die raam af, dus resolusie-onafhanklik:
 *  dieselfde spec render korrek by 1280×720 of 2560×1440.
 *
 *  `grootte` beteken NIE dieselfde ding vir elke laagsoort nie, en dit is
 *  doelbewus:
 *    • reaksie en logo → die laag se BREEDTE as breukdeel van die raam s'n;
 *    • teks           → die FONTGROOTTE as breukdeel van die raam se breedte.
 *  Teks se breedte volg uit die woorde en kan nie vooraf vasgestel word nie;
 *  'n breedte afdwing sou die teks plet. `laagKas` los dié verskil op één
 *  plek op, sodat nie die oorlegger nie en nie die renderaar dit ken nie. */
export type Plek = {
  x: number;       // 0..1 — die laag se ankerpunt in die raam
  y: number;       // 0..1
  grootte: number; // sien hierbo — betekenis hang van die laagsoort af
};

/** Die rooi gloed agter AP. Altyd aan by verstek; die kleur is oorskryfbaar
 *  vir 'n episode wat nie rooi is nie. */
export type Gloed = {
  aan: boolean;
  kleur: string;   // hex, verstek Buitelyn-rooi
  sterkte: number; // 0..1 — dekking in die middel
  radius: number;  // breukdeel van die raam se breedte
};

export type Laag =
  | {
      soort: "reaksie";
      url: string;
      wydte: number;
      hoogte: number;
      plek: Plek;
      gloed: Gloed;
    }
  | { soort: "logo"; kleur: "ink" | "wit"; plek: Plek }
  | {
      soort: "teks";
      teks: string;
      kleur: "wit" | "ink";
      belyn: "links" | "middel" | "regs";
      plek: Plek;
    };

export type DuimnaelSpec = {
  agtergrond: BeeldBron | null; // hergebruik lib/kaart/spec.ts se tipe
  lae: Laag[];                  // render-volgorde = skikking-volgorde
};
```

`BeeldBron` word uit `lib/kaart/spec.ts` hergebruik — dieselfde
`url/wydte/hoogte/fokusX/fokusY/zoem/deursigtig`-vorm, en dus dieselfde
snit-wiskunde in `lib/kaart/beeld.ts`.

`laag.ts` gee die enkele funksie wat albei kante roep:

```ts
/** Waar 'n laag in die raam beland, in pixels.
 *  `fontSize` is net teenwoordig vir teks-lae. */
export type LaagKas = {
  left: number;
  top: number;
  width: number;      // teks: die maksimum vloeibreedte tot by die raamrand
  fontSize?: number;
};

export function laagKas(laag: Laag, raam: Gleuf): LaagKas;
```

`belyn` bepaal hoe die teks uit die ankerpunt vloei: `links` laat `x` die
linkerrand wees, `regs` die regterrand, `middel` die middelpunt. Die
ankerpunt bly dus onder AP se vinger waar hy dit los, ongeag die belyning.

Die sleep-oorlegger posisioneer daarmee; satori posisioneer daarmee. Daar is
geen tweede implementering om uit sinkronisasie te raak nie.

## Data flow

**Agtergrond genereer**

1. Die blaaier stuur tot 4 verwysingsbeelde + die vryevorm-prompt as
   `multipart/form-data` na `/api/duimnael/agtergrond`.
2. Die roete verifieer die sessie (`supabaseServer().auth.getUser()`), normaliseer
   elke verwysing met sharp (≤1600px, nooit WebP) en stuur hulle as
   `image[]` na `POST /v1/images/edits` met `model=gpt-image-2`,
   `size=1536x1024`, `quality=medium`.
3. Nie-2xx onder 500 → probeer `gpt-image-1`, presies soos `fotos/skep` doen.
4. Die PNG land in die `duimnael`-emmer; die roete gee 'n publieke URL plus die
   natuurlike afmetings terug (een keer gemeet, sodat die snit-wiskunde dit
   nooit hoef te herbereken nie).
5. `maxDuration = 120` — beeldgenerering vat 30–60s.

**Reaksie-biblioteek**

- `POST /api/duimnael/reaksie` — laai 'n skoot op, normaliseer soos
  `fotos/oplaai`, stuur dit deur die bestaande Replicate-agtergrondverwydering,
  en stoor die deursigtige PNG in die `duimnael-reaksies`-emmer.
- `DELETE /api/duimnael/reaksie` — verwyder een uit die emmer.
- `scripts/saai-reaksies.ts` saai die 12 skote van 2026-08-26 eenmalig.

**Render**

Die kliënt stuur die spec na 'n bediener-aksie wat `renderDuimnael(spec)` roep.
satori haal die agtergrond en die uitknipsel by hulle publieke URL's, laai
League Spartan uit `assets/`, en gee 'n 1280×720 PNG terug — afgelaai én in die
emmer gestoor.

Let wel: satori haal die beelde by **elke** render weer af. Dit is presies
waarom elke beeld ≤1600px genormaliseer word voordat dit die stelsel binnekom.

## Error handling

Elke fout is 'n sigbare Afrikaanse boodskap, nooit 'n stil blanko nie:

| Toestand | Kode | Boodskap |
|---|---|---|
| Geen sessie | 401 | `verbode` |
| `OPENAI_API_KEY` ontbreek | 503 | `OPENAI_API_KEY ontbreek` |
| `REPLICATE_API_TOKEN` ontbreek | 503 | `REPLICATE_API_TOKEN ontbreek` |
| Beeldmodel nie-2xx | 502 | `Beeldmodel {status}: {liggaam se eerste 200}` |
| Verwysing > 15MB | 413 | `Die lêer is groter as 15MB.` |
| WebP opgelaai | 415 | `WebP werk nie — stuur PNG of JPEG.` |

Die WebP-reël staan eksplisiet omdat dit die waarskynlikste **stil**
produksiefout in hierdie module is, presies soos `fotos/oplaai` se kommentaar
dit stel.

## Testing

Volg `lib/kaart/render.test.ts` se patroon:

- `laag.test.ts` — die gedeelde meetkunde: klemming by 0 en 1, negatiewe-nul,
  en dat sleep→render 'n rondreis oorleef.
- `spec.test.ts` — normalisering: `grootte` word geklem, leë teksblokke val weg,
  onbekende laagsoorte word verwerp.
- `render.test.ts` — grondlyn-PNG-hashes vir 'n bekende spec. 'n Next- of
  satori-opgradering sal die hashes verander; dit is die punt.
- Roete-toetse met 'n gestompte `fetch` — geen werklike generasies in CI nie.

## Out of scope

- Geen duimnael-geskiedenis of weergawes. Die spec word gestoor; die emmer hou
  die uitsette. YAGNI tot AP dit vra.
- Geen A/B-toetsing van duimnaels.
- Geen outomatiese teksvoorstelle uit die episode se titel. Dit is 'n aparte
  Gemini-stap as dit later gevra word.
