# Vandag se Oorsigte — oudio-argief in hq — Design

**Date:** 2026-08-06
**Status:** Approved
**Reference:** Oudio-cron `web/app/api/cron/markte-oudio/route.ts` (skryf `${datum}-${uitgawe}.mp3`); Studio-kaartregister `admin/app/w/[slug]/studio/page.tsx`; `supabaseService()` in `admin/lib/supabase/service.ts`.

## Goal

'n Blad in hq.buitelyn.com waar Piet en AP die drie daaglikse markte-oorsigte
kan terugluister of aflaai, per dag gegroepeer, laaste sewe dae.

## Konteks — die argief bestaan reeds

Die oudio-cron loop `50 4,9,15 * * 1-5` UTC (06:50 / 11:50 / 17:50 SAST) en laai
elke uitgawe op as `${datum}-${uitgawe}.mp3` in die **publieke** `markte-oudio`
bucket. Op 2026-08-06 staan daar 22 lêers oor 8 dae, 18,8 MB.

**Die databasis onthou net die jongste uitgawe.** `markte_oorsigte` het
`datum date unique` — een ry per dag — met één `oudio_url`-kolom wat elke cron
oorskryf. Die oggend se URL is teen middagete uit die DB uit. Die lêernaam is
dus die enigste volledige indeks, en dit is presies die vorm wat ons nodig het.

## Decisions

- **Bron = die bucket, nie die tabel nie.** Lees `markte_oorsigte` en jy kry een
  speler per dag in plaas van drie.
- **Niks word ooit uitgevee nie** (Piet se keuse). Die blad wys sewe dae; ouer
  lêers bly gestoor. Teen ±2,4 MB/dag is dit ±860 MB/jaar. Geen opruim-cron.
- **Net oudio.** Die geskrewe oorsig word nie bewaar nie — `teks` is 'n enkele
  oorskryfde kolom, en die oudio bevat dieselfde oorsig hardop.
- **Plek: 'n Studio-kaart**, ingevoeg **direk ná die bestaande "Oorsigte"-kaart**.
  Dié posisie is sowel die regte leesvolgorde (Oorsigte = skryf vandag s'n;
  Vandag se Oorsigte = luister terug) as 'n gratis vermyding van 'n
  saamsmelt-botsing met die onafhanklike `gidse`-tak, wat aan die einde van
  dieselfde `GEREEDSKAP`-skikking byvoeg.
- Gebou op `main`, tak `oorsig-argief`. `gidse` bly onafhanklik.

## Argitektuur

Twee lêers plus een reël in die kaartregister.

**`admin/app/actions-oorsig-argief.ts`**

```ts
export type Uitgawe = "oggend" | "middag" | "aand";
export type Snit = { uitgawe: Uitgawe; url: string; grootte: number };
export type Dag = { datum: string; datumWoorde: string; snitte: Snit[] };

export function groepeerLeers(
  leername: string[], publiekeBasis: string, maksDae?: number
): Dag[];

export async function kryOorsigArgief(): Promise<
  { dae: Dag[]; fout: null } | { dae: []; fout: string }
>;
```

`groepeerLeers` is 'n **suiwer funksie** — lêername in, gegroepeerde dae uit.
Dit is die enigste stuk logika met randgevalle, so dit word direk getoets sonder
om Supabase te moet naboots.

- Ontleed streng teen `/^(\d{4}-\d{2}-\d{2})-(oggend|middag|aand)\.mp3$/`.
  Enigiets anders word stil geïgnoreer, sodat 'n vreemde lêer in die bucket nie
  die blad breek nie.
- Groepeer op datum, sorteer dae **nuutste eerste**, uitgawes in vaste volgorde
  oggend → middag → aand (NIE alfabeties nie — dit sou aand eerste plaas).
- Sny af op `maksDae` (verstek 7).
- `datumWoorde` via `Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", weekday, day, month, year })`.

`kryOorsigArgief` roep `supabaseService().storage.from("markte-oudio").list()`
met `limit: 1000` **en `sortBy: { column: "name", order: "desc" }`**, en gee die
fout **terug** eerder as om dit te sluk — 'n leë argief en 'n gebreekte navraag
mag nie eenders lyk nie.

Die sortering is nie kosmeties nie. Teen 3 lêers per beursdag tref die
1000-perk oor ±15 maande. Sonder 'n eksplisiete sortering is Supabase se
volgorde nie gewaarborg nie, en sou die afgekapte bladsy eendag die *nuutste*
dae kon uitlaat — die blad sou stil leeg word terwyl die lêers nog bestaan.
ISO-datums sorteer leksikografies, dus gee `name desc` altyd nuutste eerste en
bly die eerste bladsy korrek ongeag hoe groot die bucket word.

**`admin/app/w/[slug]/oorsigte-argief/page.tsx`**

Volg die sibling-blaaie presies: `dynamic = "force-dynamic"`, workspace-opsoek,
`redirect` as die slug nie "buitelyn" is nie, `notFound` as die workspace ontbreek.

Per dag 'n kaart in die huisstyl (plat, `border-2 border-ink`, geen radius of
skaduwee, hoofies as `text-xs font-semibold tracking-[0.16em] text-ink/50`), en
per uitgawe 'n ry met:
- `<audio controls preload="none" src={url}>` — `preload="none"` sodat die blad
  nie ±20 MB trek by oopmaak nie;
- 'n aflaai-skakel (`download`-attribuut) met die lêergrootte in MB.

**Vandag se onvoltooide uitgawes wys as hangend** met hul tyd (oggend 06:50,
middag 11:50, aand 17:50) in plaas van om stil te ontbreek — 'n missende
11:50-lêer moet lees as "nog nie", nie as "stukkend" nie. Dit geld slegs vir
vandag; ouer dae wys net wat bestaan.

Naweke verskyn glad nie: die cron loop Ma–Vr, so daar is niks om te wys nie.

**`admin/app/w/[slug]/studio/page.tsx`** — een inskrywing in `GEREEDSKAP`,
ingevoeg ná die `oorsig`-inskrywing:

```ts
{
  pad: "oorsigte-argief",
  naam: "Vandag se Oorsigte",
  wat: "Luister terug of laai af — die oggend-, middag- en aanduitgawes van die laaste sewe dae.",
},
```

## Foutgedrag

| Geval | Gedrag |
|---|---|
| Bucket-navraag misluk | Afrikaanse foutstrook op die blad; geen leë argief wat na dataverlies lyk nie |
| Bucket leeg | "Nog geen oorsigte nie" — eerlik, nie 'n fout nie |
| Lêernaam pas nie die patroon nie | Stil geïgnoreer |
| Uitgawe ontbreek vir vandag | Wys as hangend met sy tyd |
| Uitgawe ontbreek vir 'n ouer dag | Word eenvoudig nie gewys nie |

## Testing

`admin` het 'n vitest-suite. Getoets word `groepeerLeers`, die enigste logika met
randgevalle:

| Toets | Wat dit vasnael |
|---|---|
| Groepeer op datum | Drie lêers van een dag word één `Dag` met drie snitte |
| Uitgawe-volgorde | oggend → middag → aand, **nie** alfabeties nie |
| Dae nuutste eerste | 6 Aug voor 5 Aug |
| Sewe-dae-perk | 10 dae se lêers gee 7 `Dag`-inskrywings |
| Vreemde lêers | `willekeurig.txt`, `2026-08-06.mp3`, `2026-08-06-oggend.wav` word geïgnoreer |
| Leë bucket | Gee `[]`, gooi nie |
| URL-vorm | Elke `url` is die publieke bucket-URL vir daardie lêernaam |

## Out of scope

- Enige verwydering of opruim-cron.
- Bewaring van die geskrewe oorsig per uitgawe (`teks` bly 'n oorskryfde kolom).
- Publieke of gedeelde toegang — die blad sit agter hq se aanmelding. (Let wel:
  die bucket self is reeds publiek, so 'n direkte MP3-URL werk vir enigeen wat
  dit het; dit is bestaande gedrag, nie iets wat hierdie werk verander nie.)
- Soek, transkripsies, of RSS/podcast-voer.
