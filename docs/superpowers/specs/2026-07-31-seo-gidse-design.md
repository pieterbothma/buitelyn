# SEO-gidse + EasyEquities-klikmeting — Design

**Date:** 2026-07-31
**Status:** Approved
**Reference:** SEO-navorsing in `markte-innovasie-navorsing.md` (Afrikaanse veld feitlik leeg; huidige #1 vir "hoe om aandele te koop" is 'n FSCA-PDF). Bestaande patrone: `app/api/cron/aandele-profiele/route.ts` (Gemini-prosa, skryf-een-keer), `app/aandele/[kode]/page.tsx` (voorafgebou + JSON-LD), `admin/app/w/[slug]/studio/page.tsx` (kaart-register).

## Goal

Agt Afrikaanse gidse by `/gidse` wat (a) die 52 bestaande `/aandele`-blaaie in
een onderwerp-groep saambind, en (b) 'n verdedigbare klik-telling na
EasyEquities lewer wat Piet in 'n borgskap-onderhandeling kan wys.

Die klikmeting is die primêre opdrag, nie 'n ekstra nie: die doel is om te
bewys hoeveel verkeer Buitelyn genereer.

## Decisions

- **Agt gidse, twee groepe.** Beginner (kommersiële intensie, EasyEquities pas
  natuurlik): `hoe-om-aandele-te-koop`, `wat-kos-dit-om-te-bele`,
  `hoe-kies-jy-n-makelaar`, `jse-of-oorsee`. Konsep (interne skakels na
  aandeelblaaie): `wat-is-n-dividend`, `wat-is-n-etf`, `wat-is-die-top-40`,
  `wat-is-n-pe-verhouding`.
- **Gemini skryf die Afrikaans**, mens hersien in 'n git-diff voor publikasie.
- **Skrip, nie 'n cron nie.** Gidse is permanente, voldoeningsensitiewe kopie;
  net 'n mens besluit wanneer dit verander.
- **EasyEquities is 'n gewone skakel** (geen affiliasie-ooreenkoms). Ons besit
  al die meting. Die bestemming is één konfigurasiewaarde sodat 'n
  vennootskakel later ingeprop kan word sonder om 'n artikel te raak.
- **Subtiel is struktureel afgedwing**, nie 'n prompt-versoek nie: die
  komponent kan hoogstens één inlyn-vermelding per blad uitreik.
- **Bediener-kant klikmeting** deur 'n eie herlei-roete; GA4 is net 'n
  kruiskontrole.

## Inhoudspyplyn

`scripts/gidse-skryf.ts`, met `npm run gidse:skryf`. Een Gemini-oproep per
gids (`gemini-2.5-flash`, temperature 0.4, `responseMimeType: application/json`).
Bondel-oproepe word vermy — agt 700–1000-woord gidse in een antwoord laat die
kwaliteit inmekaarsak.

**Skryf nooit oor nie.** 'n Gids wie se lêer bestaan, word oorgeslaan. Dit volg
die `aandeel_profiele`-reël: hergenerering vereis dat 'n mens die lêer eers
doelbewus verwyder.

**Formaat: gestruktureerde JSON**, `content/gidse/<slug>.json`:

```json
{
  "titel": "...", "beskrywing": "...", "intro": "...",
  "afdelings": [{ "kop": "...", "paragrawe": ["..."] }],
  "verwant": ["naspers", "sasol"],
  "sponsor_konteks": "..."
}
```

`verwant` is 'n lys `/aandele`-slugs (nie tickers nie). `sponsor_konteks` is die
één sin waarin die EasyEquities-vermelding natuurlik lê — net vir die vier
beginnergidse; konsepgidse laat dit weg (`null`), en die komponent reik dan
niks uit nie.

Markdown is verwerp: dit vereis 'n nuwe afhanklikheid (`react-markdown`) en gee
tipografie-beheer aan 'n ontleder. 'n Vaste vorm beteken die mislukking is "'n
afdeling ontbreek" (sigbaar, goedkoop) eerder as "die blad lyk stilweg verkeerd".

**Prompt-beperkings (hard):** suiwer hedendaagse Afrikaans met die
geen-Nederlands/Vlaams-reël uit `skryfVertalings`; nooit "Die Buitelyn"
(sien `buitelyn-naming-rule`); **geen imperatiewe** (`koop`, `verkoop`,
`belê in`) — die FSCA-grenslyn; verpligte interne skakels.

## Blaaie

- `/gidse` — indeks; `/gidse/[slug]` — gids. Voorafgebou met
  `generateStaticParams` en `revalidate = 900`, soos `/aandele`. Die prosa is
  staties; die revalidate-venster is net vir die twee live-data-blokke hieronder.
- JSON-LD: `Article` + `BreadcrumbList`. **Nie FAQPage nie** — daardie
  ryk-resultate is sedert Mei 2026 dood (sien navorsing).
- `sitemap.ts` groei met 9 URL's; voetskrif kry 'n "Gidse"-skakel.
- **Twee-rigting interne skakels:** konsepgidse skakel af na tersaaklike
  `/aandele`-blaaie; elke aandeelblad kry 'n klein skakel op na die gidse.
  Dít is die SEO-meganisme — 52 los prysblaaie plus 8 weesartikels word een
  onderling geskakelde onderwerp-groep.
- **Live data in twee gidse:** `wat-is-die-top-40` wys die werklike Top
  40-vlak (`getQuotes(["STX40.JO"])`); `wat-is-n-dividend` wys komende
  dividende uit `dividend_kalender`. Albei hergebruik bestaande funksies en is
  wat dié blaaie beter maak as die statiese PDF wat tans eerste rangeer.

## Sponsor-skakel en klikmeting

`lib/sponsor.ts` besit naam, bestemming en UTM-stel — een plek om 'n
vennootskakel later in te ruil.

**Herlei-roete** `app/uit/[sponsor]/route.ts`:

1. Lees `?g=<gids-slug>&p=<plek>`.
2. Verwerp bekende kruiper-UA's.
3. **307** na die bestemming + UTM's — onmiddellik.
4. Log ná die antwoord met Next se `after()` (patroon uit die
   Telegram-webhook), sodat die besoeker nooit op die databasis wag nie.

**Tabel `sponsor_klikke`** (ap-hq Supabase, service-only RLS):
`sponsor`, `gids` (slug), `plek` (`inlyn` of `voetkaart`), `geskep_at`,
`verwysing` (net die gasheer, nooit die volle URL), `besoeker_hash`.

`besoeker_hash` is 'n **daagliks-roterende gesoute hash van IP + UA**. Dit gee
unieke-besoeker-tellings sonder om ooit 'n IP te stoor — POPIA-veilig deur
konstruksie, nie deur belofte nie.

**Bot-filtering is die geloofwaardigheid van die hele oefening.** Wys jy
EasyEquities 1 284 klikke waarvan 'n derde Googlebot was, verloor jy nie net
die onderhandeling nie maar ook die vertroue vir die volgende een. Daarom:
kruiper-UA's uit, en dieselfde `besoeker_hash` op dieselfde gids binne 30
sekondes tel een keer.

**`rel="sponsored noopener"`, `target="_blank"`** op elke skakel. Google vereis
`sponsored` vir skakels uit 'n vergoedingsooreenkoms, en 'n borgskap van die
program tel. Dit weglaat riskeer 'n skakelskema-boete op presies die blaaie wat
ons probeer laat rangeer.

## Toon en voldoening

- **Hoogstens één inlyn-vermelding per gids**, net in die vier beginnergidse.
  Konsepgidse kry geen. Plus één klein voetkaart op daardie vier. Geen banners,
  geen herhaalde CTA's. Die komponent kán nie meer uitreik nie.
- **Openbaarmaking, reguit gestel:** EasyEquities borg Buitelyn se
  YouTube-program, en Buitelyn verdien niks aan die skakel self nie. Dis waar,
  dus is dit sowel die eerlike stap as 'n vertroue-sein — en dit voldoen
  terselfdertyd aan Google se verwagting.
- **Vaste vrywaring** sluit elke gids af: Buitelyn is nie 'n gemagtigde
  finansiële diensverskaffer nie; dié gids is algemene inligting, nie advies nie.

## Rapportering

Nuwe Studio-kaart "Sponsor-klikke" (`admin/app/w/[slug]/sponsor/page.tsx`,
plus 'n inskrywing in `GEREEDSKAP`): maandtotaal met verandering teenoor die
vorige maand, uiteensetting per gids en per plek, en 'n CSV-aflaai vir die
e-pos wat Piet werklik stuur.

## Testing

| Toets | Wat dit vasnael |
|---|---|
| UTM-bouer | Bestemming + parameters korrek saamgestel |
| Bot-filter | Bekende kruiper-UA's verwerp, regte blaaiers deurgelaat |
| Dedupe-venster | Dieselfde hash + gids binne 30s tel een keer |
| Inhoud-valideerder | Elke gids het sy velde, die vrywaring, en **geen verbode imperatiewe** |
| Skakel-valideerder | **Elke `verwant`-slug bestaan werklik in `AANDELE`** |

Die skakel-valideerder is nie seremonieel nie: Gemini gaan met vertroue
`/aandele/satrix` uitdink. Die toets vang dit voor publikasie eerder as ná
Google 'n 404 geïndekseer het.

## Out of scope

- Huishoudelike geldgidse (petrolprys, repokoers) — ander gehoor, later golf.
- Enige affiliasie-/kommissie-integrasie; dit bly 'n gewone skakel tot
  EasyEquities 'n vennootskakel gee.
- Studio-redigering van gidse: veranderinge gaan deur 'n git-commit.
- E-pos-/bot-rapportering van klikke; die Studio-kaart is die enigste verslag.
