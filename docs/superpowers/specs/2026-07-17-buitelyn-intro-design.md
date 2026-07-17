# Buitelyn YouTube Intro — Design

**Date:** 2026-07-17
**Status:** Approved
**Reference:** `~/Downloads/Buitelyn Begin.mp4` (10s AI mockup, 1280×720@24), logo PNGs in `~/Downloads/Buitelyn (24).png` and `Buitelyn-1.png`

## Goal

A ~10-second, 1920×1080 @ 30fps intro for *Buitelyn*, a semi-business Afrikaans YouTube news show. Recreate and polish the mockup's sequence in Remotion using fully procedural SVG — crisper than the AI mockup and editable via props.

## Decisions

- **Direction:** Recreate the mockup's choreography faithfully, polished.
- **Audio:** None baked in yet; an `<Audio>` slot ready for a track supplied later. Animation timed to the mockup's pacing.
- **Name cards:** Both presenters, spelled exactly: "Suzaan Steyn", "André-Pierre du Plessis".
- **Sponsors:** Not in the intro (deals not final; keep intro evergreen).
- **Format:** 1920×1080, 30fps, ~10s (300 frames), H.264 MP4.
- **Build method:** Fully procedural SVG/React; no bitmap assets from the mockup.

## Visual system

- **Colours:** paper `#EBEAE6`, off-white `#F7F6F2`, ink `#1A1A1A`, red `#F03028`. No others.
- **Type:** League Spartan via `@remotion/google-fonts` — Bold/Black for wordmark and names, Light/Regular for background type-specimen texture.
- **Motifs:** red dot; thin black logo box; faint blueprint grid with subtle perspective; parametric spirograph rose (rotated arcs, stroke-dash "draws itself"); giant background letters / type-specimen collage.

## Choreography (300 frames @ 30fps)

| Scene | Time | Content |
|---|---|---|
| 1 Wordmark tease | 0.0–1.0s | Off-white; "Buitelyn" reveals with half-box stroke drawing in like a cursor |
| 2 Spirograph | 1.0–2.8s | Grey grid paper; spirograph draws itself; red dot orbits in; wordmark slides through behind |
| 3 Brand hit | 2.8–4.2s | Wordmark large centred; red circle scales behind "lyn"; logo box + dot lock |
| 4 Name card 1 | 4.2–5.8s | Mosaic-rectangle reveal, white card: "Suzaan Steyn"; giant drifting letters behind |
| 5 Name card 2 | 5.8–7.4s | Black card with sparkle glint: "André-Pierre du Plessis"; type-specimen collage behind |
| 6 Resolve | 7.4–9.5s | Blueprint "B" construction draws; small boxed "Buitelyn ●" logo pops centre and settles |
| 7 Out | 9.5–10.0s | Cut to black — clean edit point |

## Architecture

- Remotion project at repo root (`~/die buitelyn`); this repo becomes the show's motion toolkit (lower-thirds, thumbnails later).
- One `<Composition id="BuitelynIntro">`; scenes in `src/scenes/Scene1…Scene6`; shared motifs in `src/components/` (Grid, Spirograph, RedDot, LogoBox, TypeTexture, MosaicReveal, Wordmark).
- All configurable text/colours/timings in `src/config.ts` (presenter names are props — one-line edits).
- Motion via `spring()` / `interpolate()` only; any scatter placement uses Remotion's seeded `random()` (never `Math.random()` — parallel frame rendering would flicker).

## Error handling / constraints

- Font loaded via `@remotion/google-fonts/LeagueSpartan` (bundled, no network at render).
- Deterministic rendering: no time/random APIs outside Remotion helpers.
- Scene components take `progress`-style inputs derived from `useCurrentFrame()` locally within `<Sequence>` offsets so scenes stay independently testable.

## Verification

- Remotion Studio live preview during build.
- Still-frame renders at each scene's key beat, compared against extracted mockup frames.
- Full `npx remotion render` MP4 checked end-to-end.

## Out of scope

Sponsor cards, outro/lower-thirds, 4K master (re-render later), music syncing (re-choreograph when track arrives).
