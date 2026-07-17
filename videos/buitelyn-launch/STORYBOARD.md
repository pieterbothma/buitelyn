---
format: 1080x1920
message: "Buitelyn is 'n splinternuwe Afrikaanse nuusprogram — sake, politiek en als tussenin — aangebied deur Suzaan Steyn en André-Pierre du Plessis. Kyk nou."
arc: Announcement/Reveal — Hook → Intro → Coverage → Sake → Presenters → CTA
audience: Afrikaanssprekende TikTok-kykers wat nuus en sake volg
mode: collaborative
music: none
---

## Video direction

- **Palette system** (from `frame.md` roles): canvas = warm paper, ink = near-black for all primary type and hairlines, accent red is SCARCE — the dot, one payoff element per frame at most. Green appears ONLY inside market up-arrows/values. Surfaces are flat; hairline rules are the only borders; zero shadows, zero gradients.
- **Motion grammar + reveal model**: long-tail smooth settles (`power3`) everywhere — no bounce, no overshoot. This is a SILENT video: each frame carries an internal beat grid (~0.8–1.1s between reveals) instead of VO cues; reveals are spread across the back ~50% of every shot, never front-loaded. During holds: stillness, at most subtle jitter.
- **Rhythm / held frames**: frames 5 and 6 (presenters) are the calm beats — one restrained move each, then a long held read. Frame 4 semi-calm. Frames 1, 2 and 7 carry the energy peaks (collision, lockup, beat-slam).
- **Negative list**: no bouncy eases; no breathing/pulsing cards; no back-half pans or pushes except the single named push in frame 4; no browser chrome, bokeh, glows, or purple-blue gradients; no shadows or rounded corners (brand is flat + square); never the slideshow failure (front-load then freeze) or the screensaver failure (elements floating independently). Bottom ~17% of canvas stays clear of essential content.

## Frame 1 — Wat is dit?

- scene: 'n Woord-slot sikleer deur MARKTE / POLITIEK / SPORT / TEGNOLOGIE / EIENDOM, dan bars BUITELYN van buite die raam in en stoot alles opsy
- voiceover: ""
- duration: 5s
- transition_in: cut
- status: animated
- src: compositions/frames/01-wat-is-dit.html
- type: hook
- persuasion: Curiosity gap — a category riddle resolved by the brand
- beat: curiosity → intrigue
- blueprint: ticker-takeover (Reproduce)
- focal: the crashing BUITELYN wordmark (typographic, no asset)
- asset_candidates:

Scene 1 (0.0–1.2s): paper canvas with faint hairline grid; lead-in line "WAT KYK JY VANAAND?" lands upper-third, centered, via per-word staggered reveal (`dynamic-content-sequencing`), smooth long-tail settle.
Scene 2 (1.2–3.4s): beneath it, one oversized slot word cycles by in-place token cycle (`discrete-text-sequence`): MARKTE → POLITIEK → SPORT → TEGNOLOGIE → EIENDOM — centered, ~55% width, each swap a hard cut on the internal beat. Nothing else on canvas.
Scene 3 (3.4–4.3s): the signature collision — BUITELYN (display weight, ink) crashes in from off-screen right with a motion-blur streak (`motion-blur-streak`) and physically shoves the cycling word off-left; it settles dead-center on a long-tail (`power3`).
Scene 4 (4.3–5.0s): held read; the red dot pops in after the wordmark's final n (`spring-pop-entrance`, smooth settle) — the only red on screen. Still.

narrativeRole: Stop the scroll with a riddle in the viewer's own vocabulary; the brand answers it.
keyMessage: Iets nuuts kom — Buitelyn.

## Frame 2 — Die onthulling

- scene: Die vierkantige Buitelyn-merk bou homself — boks-raam teken in, woordmerk sak op die onderste rand, rooi kolletjie pop regs-bo — met "SPLINTERNUWE AFRIKAANSE NUUSPROGRAM" wat onder intik
- voiceover: ""
- duration: 6s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-onthulling.html
- type: product_intro
- persuasion: Category announcement — naming the new thing plainly
- beat: clarity + excitement
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/logo-square.png
- roles: logo-square = cutout (the hero lockup; rebuild it procedurally so it can assemble — box, wordmark on the bottom edge, dot — matching the asset's proportions exactly)
- asset_candidates: assets/logo-square.png — square brand mark, the reveal target

Adapt: keep the assemble-into-lockup signature; the assembly IS the brand's own anatomy (box draws → wordmark rises onto the bottom edge → dot arrives) instead of abstract parts orbiting.
Scene 1 (0.0–1.6s): empty paper with hairline grid; a square ink outline draws itself stroke-by-stroke (`svg-path-draw`) centered, ~55% of canvas width, upper-half placement.
Scene 2 (1.6–3.2s): the wordmark "Buitelyn" cascades letter-by-letter onto the square's bottom edge (per-word staggered reveal, `dynamic-content-sequencing`), descender crossing the border; the square's face fills off-white as the letters land.
Scene 3 (3.2–4.2s): the red dot pops top-right inside the square (`spring-pop-entrance`, smooth) — lockup complete, exact match of the brand asset.
Scene 4 (4.2–6.0s): below the mark, "SPLINTERNUWE AFRIKAANSE NUUSPROGRAM" types on behind a blinking caret (`discrete-text-sequence` + `context-sensitive-cursor`), small caps, letterspaced; then a held read. Still.

narrativeRole: Land the promise — a brand-new Afrikaans news program exists.
keyMessage: Buitelyn is 'n splinternuwe Afrikaanse nuusprogram.

## Frame 3 — Als tussenin

- scene: Seksie-teëls (MARKTE · POLITIEK · SPORT · TEGNOLOGIE · EIENDOM · BUITELAND · MENINGS) bou in 'n kaskade-rooster, dan land 'n groter payoff-teël "EN ALS TUSSENIN."
- voiceover: ""
- duration: 6s
- transition_in: push-slide UP
- status: animated
- src: compositions/frames/03-als-tussenin.html
- type: feature_showcase
- persuasion: Value stacking — breadth shown at once
- beat: aspiration + belonging
- blueprint: grid-card-assemble (Reproduce)
- focal: the payoff tile "EN ALS TUSSENIN."
- asset_candidates:

Scene 1 (0.0–1.4s): paper + grid; the first two section tiles (MARKTE, POLITIEK) land in a 2-column grid, centered block ~70% width, staggered cascade (`dynamic-content-sequencing`), long-tail settles. Tiles are flat off-white cards with 2px ink hairline borders, small-caps League Spartan.
Scene 2 (1.4–3.6s): the remaining five tiles (SPORT, TEGNOLOGIE, EIENDOM, BUITELAND, MENINGS) continue the cascade on the internal beat — one per ~0.45s, back-half paced, never simultaneous.
Scene 3 (3.6–4.8s): the payoff tile "EN ALS TUSSENIN." lands full-grid-width beneath them, inverse contrast (ink tile, off-white text), arriving on a smooth spring-pop (`spring-pop-entrance`) — the climax of the cascade.
Scene 4 (4.8–6.0s): held read of the full board; at most subtle jitter (`sine-wave-loop`, low amplitude) on the payoff tile. Still otherwise.

narrativeRole: Show the breadth — this is not a narrow business bulletin.
keyMessage: Sake, politiek, sport — en als tussenin.

## Frame 4 — Sake, ernstig

- scene: Marktikker-kaarte tel op en gly verby — JSE ▲ +1,2% (groen), R/$ ▼ 18,42 (rooi), GOUD ▲ +0,4% — onder die reël "MAAR SAKE VAT ONS ERNSTIG."
- voiceover: ""
- duration: 5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/04-sake-ernstig.html
- type: benefit_highlight
- persuasion: Show-don't-tell proof — live market grammar signals competence
- beat: trust + confidence
- blueprint: dataviz-countup (Adapt)
- focal: the JSE ticker card
- asset_candidates:

Adapt: keep the push-through-the-data signature; the "chart" is a stack of three market ticker cards with counting values instead of a ring.
Scene 1 (0.0–1.0s): headline "MAAR SAKE VAT ONS ERNSTIG." lands upper-third via per-word staggered reveal (`dynamic-content-sequencing`), ink on paper.
Scene 2 (1.0–3.4s): three ticker cards reveal sequentially in a centered vertical stack (~70% width, layered depth — each card a flat off-white surface with hairline border): JSE ▲ +1,2% (green value), then R/$ ▼ 18,42 (red value), then GOUD ▲ +0,4% (green) — each value counts up as its card lands (`counting-dynamic-scale`, restrained scale), arrows draw in (`svg-path-draw`). One card per beat, back-half paced.
Scene 3 (3.4–5.0s): a single gentle zoom-to-target (`coordinate-target-zoom`) onto the JSE card as its value ticks to final; then still — this is the frame's one named camera move, and it ends before the hold.

narrativeRole: Sharpen the positioning — the sakenuus backbone under the broad show.
keyMessage: Die sake-kant is die ruggraat.

## Frame 5 — Aanbieder een

- scene: Kicker "JOU AANBIEDERS" — dan 'n portret-kaart: Suzaan Steyn se foto in 'n dun ink-raam, naam op 'n wit kaart onderaan
- voiceover: ""
- duration: 5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-suzaan.html
- type: feature_showcase
- persuasion: Authority by association — real faces make a new brand trustworthy
- beat: warmth + trust
- blueprint: titlecard-reveal (Adapt)
- focal: assets/presenter-suzaan.png
- roles: presenter-suzaan = cutout (foreground subject; hairline frame sits behind her, name plate in front)
- asset_candidates: assets/presenter-suzaan.png — three-quarter portrait cutout on transparency, beige blazer

Adapt: keep the one-restrained-move signature; the move is the cutout's slide-up rise. This is a calm beat — low motion is the payload.
Scene 1 (0.0–1.0s): kicker "JOU AANBIEDERS" in small caps, letterspaced, upper-third between two hairline rules (per-word reveal, `dynamic-content-sequencing`).
Scene 2 (1.0–2.6s): Suzaan's cutout rises from the bottom edge into place (single slide-up with crossfade — the frame's ONE move), occupying ~65% of canvas height, centered; behind her a thin ink hairline frame draws in (`svg-path-draw`) so she stands in front of it — layered depth: frame behind, cutout mid, plate front.
Scene 3 (2.6–5.0s): an off-white name plate slides up over her lower third: "Suzaan Steyn" in display weight, ink; then a long held read — completely still.

narrativeRole: Put a face to the show — presenter one.
keyMessage: Aangebied deur Suzaan Steyn.

## Frame 6 — Aanbieder twee

- scene: Tweede portret-kaart gly in: André-Pierre du Plessis, selfde raam-taal, ink-donker naamkaart vir kontras
- voiceover: ""
- duration: 5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-andre-pierre.html
- type: feature_showcase
- persuasion: Authority by association — the duo completes the show's identity
- beat: warmth + anticipation
- blueprint: titlecard-reveal (Adapt)
- focal: assets/presenter-andre-pierre.png
- roles: presenter-andre-pierre = cutout (foreground subject; hairline frame behind, dark name plate in front)
- asset_candidates: assets/presenter-andre-pierre.png — three-quarter portrait cutout on transparency, blue-striped shirt

Adapt: mirror of Frame 5 — same one-move discipline; the delta is the dark name plate (ink card, off-white text), echoing the brand's black presenter card.
Scene 1 (0.0–0.8s): the kicker rules from Frame 5 persist in position (continuity); no re-reveal.
Scene 2 (0.8–2.4s): André-Pierre's cutout rises from the bottom edge (single slide-up with crossfade), ~65% canvas height, centered; ink hairline frame draws behind him (`svg-path-draw`).
Scene 3 (2.4–5.0s): the INK name plate slides up over his lower third: "André-Pierre du Plessis" in off-white display type; long held read — completely still.

narrativeRole: Complete the pair — presenter two.
keyMessage: … en André-Pierre du Plessis.

## Frame 7 — Kyk nou

- scene: Drie vinnige tipografie-slae — "SAKE." / "POLITIEK." / "ALS TUSSENIN." — dan vee alles skoon en die vierkantige logo land met "KYK NOU", aanbieders staan onder, rooi kolletjie flikker soos 'n REC-lig
- voiceover: ""
- duration: 8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/07-kyk-nou.html
- type: cta
- persuasion: Rule of three → single clear action
- beat: urgency-to-act
- blueprint: kinetic-type-beats (Adapt)
- focal: assets/logo-square.png
- roles: logo-square = cutout (upper hero; procedural rebuild to match, or placed asset) · presenters-duo = cutout (lower half, standing beneath the mark)
- asset_candidates: assets/logo-square.png — final lockup target; assets/presenters-duo.png — both presenters full-length on transparency, standing beneath/beside the logo for the human close

Adapt: keep the beat-slam signature for the opening barrage; extend the resolve into a logo + presenters lockup instead of a bare wordmark.
Scene 1 (0.0–2.4s): three full-screen type slams on the internal beat — "SAKE." / "POLITIEK." / "ALS TUSSENIN." — each centered at display scale, entering via kinetic beat-slam (`kinetic-beat-slam`), seams between them cut at peak velocity (velocity-matched cuts, `cut-catalog.md`). Ink on paper; nothing else.
Scene 2 (2.4–3.0s): the last slam clears — elements exit through a fast zoom-through seam (`cut-catalog.md`) to clean paper.
Scene 3 (3.0–4.6s): the square logo lands upper-third, centered, arriving on a smooth scale-swap (`scale-swap-transition`); the presenter duo cutout rises from the bottom edge to stand beneath it (slide-up, long-tail settle) — asymmetric vertical layout: mark upper ~35%, people lower ~50%, layered so they overlap the mark's lower hairline slightly.
Scene 4 (4.6–6.0s): "KYK NOU" plate pops between logo and presenters (`spring-pop-entrance`, smooth) — off-white plate, ink display type, the single red dot at its corner.
Scene 5 (6.0–8.0s): held read; the logo's red dot flickers like a REC light as a finite deterministic tween sequence (no repeat/yoyo — discrete opacity steps on the timeline). Everything else completely still.

narrativeRole: Convert attention into the watch action.
keyMessage: Kyk nou.
