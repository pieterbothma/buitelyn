# Nuus — nuuspod se stories met oortjies per bron — Design

**Date:** 2026-08-18
**Status:** Approved
**Reference:** nuuspod se leesroete `~/nuuspod/src/app/api/articles/all/route.ts` (+ `src/lib/storage.ts`, `src/lib/types.ts`); die oortjie-patroon op `/markte` (`?blad=`); [[2026-08-18-nibs-design]] vir die NIBS-oorhandiging.

## Goal

'n Nuus-afdeling in die Buitelyn-werkruimte wat dieselfde stories wys wat Piet
reeds op nuuspod kry, met oortjies bo-aan per nuusbron — en 'n knoppie wat 'n
storie regstreeks na NIBS stuur.

## Konteks — nuuspod doen die swaar werk reeds

nuuspod (LIVE op nuuspod.co.za) skraap News24/Netwerk24, Maroela Media, The
Citizen, Daily Maverick, PoliticsWeb, CommonSense, Daily Investor, MyBroadband
en 'n stel internasionale RSS-strome (BBC, Guardian, Al Jazeera, NPR, ABC, RNZ,
GroundUp, MercoPress). Gemini herskryf en kategoriseer, en die uitslag land in
Vercel Blob.

`GET /api/articles/all` gee die jongste artikels terug. Elke artikel dra:

```ts
{ id, headline, summary, body, sourceUrl, sourceName, category,
  imageUrl?, publishedAt, createdAt }
```

`body` is die VOLLE teks — dis wat die NIBS-oorhandiging moontlik maak.

## Decisions

- **Buitelyn roep nuuspod se roete; dit skraap niks self nie** (Piet se keuse).
  nuuspod betaal reeds vir 'n skraper-API, Firecrawl en NewsAPI; dieselfde
  strome 'n tweede keer haal sou daardie koste verdubbel en twee effens
  verskillende kopieë van dieselfde nuus gee.
- **Een oortjie per `sourceName`, al die bronne** (Piet se keuse). ±15 oortjies,
  dus rol die balk sywaarts op 'n smal skerm eerder as om oor drie rye te vou.
- **Die oortjie is 'n `?bron=`-parameter, bediener-gerender**, presies soos
  `/markte` se `?blad=`. Geen kliënt-toestand vir iets wat 'n skakel hoort te
  wees nie — 'n oortjie bly deelbaar en oorleef 'n herlaai.
- **10 minute se `revalidate`.** Die nuus verander nie vinniger nie, en 'n
  bladlaai kos dan meestal niks.
- **Die NIBS-oorhandiging loop deur sessionStorage, nie 'n URL-parameter nie.**
  'n Artikel se `body` is duisende karakters; blaaiers en instaanbedieners kap
  URL's lank voor dit. NIBS lees dit een keer en vee dit dan uit, sodat 'n ou
  storie nie dae later weer opduik nie.
- **Ons voeg NIE 'n gedeelde geheim by nuuspod se roete in hierdie werk nie.**
  Dit is 'n verandering in 'n ander repo; dit staan as opvolgwerk hier onder.

## Argitektuur

| Lêer | Rol |
|---|---|
| `admin/app/w/[slug]/nuus/page.tsx` | Bediener-blad. Haal, groepeer per `sourceName`, lees `?bron=`. |
| `admin/lib/nuuspod.ts` | `kryArtikels(): Promise<Artikel[]>` — haal + valideer die vorm; `[]` by 'n fout. |
| `admin/components/nuus-lys.tsx` | Kliënt: die "Na NIBS →"-knoppie (sessionStorage + navigeer). |
| `admin/components/shell.tsx` | Een nav-reël onder die Buitelyn-werkruimte. |

Die oortjiebalk en die storielys is bediener-gerender; net die knoppie is 'n
kliënt-komponent. Dit hou die blad se JS klein.

## Data-vloei

```
nuuspod.co.za/api/articles/all ──(10 min kas)──> kryArtikels()
        │
   groepeer per sourceName ──> oortjiebalk (?bron=)
        │
   storielys ──"Na NIBS →"──> sessionStorage["nibs-bronteks"] ──> /w/buitelyn/nibs
```

## Foutehantering

- **nuuspod af of stadig:** `kryArtikels()` vang dit en gee `[]`; die blad wys
  "Kon nie nuus haal nie" en bly staan. Dit breek nooit die res van hq nie.
- **Onbekende `?bron=`:** val terug op die eerste oortjie eerder as 'n leë blad.
- **Artikel sonder `body`:** die "Na NIBS"-knoppie is gedeaktiveer vir daardie
  storie; die skakel na die bron bly.

## Toetsing

- `lib/nuuspod.test.ts` — 'n gestoorde JSON-vaslegging: groepering per bron,
  'n wanvormige antwoord gee `[]`, 'n artikel sonder `body` oorleef die parse.
- Werklike blaaier-nagaan op hq.buitelyn.com: oortjies wissel, en "Na NIBS"
  vul die Bronteks werklik in (sien `verify-frontend-change`).

## Buite bestek / opvolgwerk

- Geen soek, geen filter, geen stoor van artikels in Buitelyn nie.
- Geen prente nie — `imageUrl` word gehaal maar nie gewys nie; die lys bly teks.
- **Opvolg:** `/api/articles/all` op nuuspod is tans oop vir enigiemand wat die
  URL ken. Niks daarin is geheim nie (dis gepubliseerde nuus), maar dit is jou
  skraap-koste wat ander se verkeer bedien. 'n Gedeelde geheim is 'n klein
  verandering in die nuuspod-repo.
