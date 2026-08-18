# NIBS — plak, vertaal, verwerk, praat — Design

**Date:** 2026-08-18
**Status:** Approved
**Reference:** Bestaande oudio-blad `admin/app/w/[slug]/oudio/page.tsx` + `admin/components/audio-studio.tsx`; die verwerk-stap `verwerkTeksVirAudio` in `admin/app/actions-audio.ts`; die TTS-roete `admin/app/api/audio/generate/route.ts`; Gemini-helper `admin/lib/gemini.ts`.

## Goal

'n Nuwe NIBS-afdeling in die Buitelyn-werkruimte waar 'n mens teks plak, dit na
Afrikaans laat vertaal, dit vir voorlesing laat gereedmaak, 'n stem kies en
oudio genereer.

## Konteks — wat reeds staan

`/w/buitelyn/oudio` doen reeds plak → verwerk → genereer, met 'n lys
Substack-plasings langsaan. Wat dit NIE het nie: 'n vertaalstap en enige
stemkeuse — dit is vasgedraad aan `ELEVENLABS_VOICE_ID`.

Die TTS-roete kap lang teks by paragraaf-grense in stukke van ±2500 karakters
(v3 se perk), gee elke stuk die "Ek praat Afrikaans."-warm-up en sny dit met
die alignment-tye weer presies uit. Dit werk; ons raak nie daaraan nie.

## Decisions

- **NIBS is 'n NUWE afdeling. Die Oudio-blad bly onaangeraak** (Piet se keuse).
  Oudio bly die plek vir lang Substack-episodes; NIBS is die vinnige plak-en-
  praat-gereedskap.
- **Niks word gestoor nie** (Piet se keuse). Geen tabel, geen lys. Die MP3 land
  steeds in die `audio-episodes`-emmer met sy ry in `audio_episodes` — daardie
  tabel hou reeds `voice_id` by, dus is die stemkeuse agterna naspeurbaar.
- **Twee bokse, nie een nie.** Die bronteks bly staan; die skrip is die
  redigeerbare een. 'n Swak vertaling kos jou dus nooit die oorspronklike nie.
- **Die vertaling loop deur Gemini**, soos elke ander Afrikaanse teks in die
  huis.
- **Die vertaalstap is OPSIONEEL.** Plak jy reeds Afrikaans, spring jy na stap
  2. Die knoppies is genommer maar nie afgedwing nie.
- **Die blaaier stuur 'n stem-NAAM, nie 'n stem-ID nie.** 'n ID in die
  kliëntbundel laat enigiemand met die blad oop jou ElevenLabs-kwota teen enige
  stem bestee. 'n Twee-waarde-enum kos niks en sluit dit.
- **`stem` is OPSIONEEL op die TTS-roete** en val terug op Alida. Die drie
  bestaande oproepers (oorsig-studio, audio-studio, die crons) werk dus
  onveranderd voort — geen vlagdag nie.

## Argitektuur

| Lêer | Rol |
|---|---|
| `admin/app/w/[slug]/nibs/page.tsx` | Bediener-blad, `slug !== "buitelyn"` herlei soos die oudio-blad. |
| `admin/components/nibs-studio.tsx` | Kliënt: twee tekskassies, drie knoppies, stemkieser, speler. |
| `admin/app/actions-nibs.ts` | `vertaalNaAfrikaans(teks)` — Gemini, aangemeld-hek soos die ander aksies. |
| `admin/lib/stemme.ts` | `STEMME` — die naam→ID-kaart. Slegs bediener-kant. |
| `admin/app/api/audio/generate/route.ts` | Een opsionele `stem`-veld by. |
| `admin/components/shell.tsx` | Een nav-reël onder die Buitelyn-werkruimte. |

### Stemme

```ts
export const STEMME = {
  alida: { naam: "Alida", id: process.env.ELEVENLABS_VOICE_ID ?? "" },
  akker: { naam: "Akker", id: "LG95yZDEHg6fCZdQjLqj" },
} as const;
```

Alida is die stem wat die oorsigte reeds gebruik; sy bly die verstek. Akker kom
nuut by. Die kliënt kry net die name.

### Die titel

Die TTS-roete vereis 'n `titel` — dit bou die lêernaam daaruit en skryf dit in
`audio_episodes`. NIBS het nie 'n titel nie, dus stuur dit `Nibs <ISO-datum>`
(bv. `Nibs 2026-08-18`). Die roete voeg reeds 'n `Date.now()`-voorvoegsel by
die pad, dus bots twee nibs op dieselfde dag nie.

## Data-vloei

```
plak → Bronteks
  │
  ├─1─ vertaalNaAfrikaans() ──> Skrip
  │
  ├─2─ verwerkTeksVirAudio() ─> Skrip (met [energetic]-etikette, redigeerbaar)
  │
  └─3─ POST /api/audio/generate { titel, teks: skrip, stem }
                    │
              STEMME[stem].id ──> ElevenLabs ──> MP3 ──> audio-episodes-emmer
```

## Foutehantering

- Gemini val: die knoppie gee 'n boodskap, die Skrip bly onaangeraak.
- Onbekende `stem` op die roete: val terug op Alida eerder as om te faal.
- `ELEVENLABS_VOICE_ID` ontbreek: die roete gee reeds 'n duidelike 500; ons
  behou dit.
- Leë Skrip: knoppie 3 bly gedeaktiveer.

## Toetsing

- `lib/stemme.test.ts` — 'n onbekende naam val terug op Alida; albei name los
  op na 'n nie-leë ID.
- Werklike blaaier-nagaan van al drie stappe op hq.buitelyn.com voor "klaar",
  insluitend albei stemme (sien `verify-frontend-change`).

## Buite bestek

Geen NIBS-argief, geen stoor van bronteks of skrip, geen bewerking van die
Oudio-blad, geen nuwe stemme buiten dié twee.
