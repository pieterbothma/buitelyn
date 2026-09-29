---
workflow: motion-graphics
message: "What to expect at the Promenader print party — Sunday 25 Oct, 4pm, @toneelhuis, 61 Loop St. Tickets on Quicket, R200."
destination: instagram (feed, 4:5)
aspect: 1080x1350
length: 31s @ 30fps
bpm: 120 (drop at 4.0s)
narration: no
---

## Intent

A motion launch poster for Promenader (The Sea Point paper, Seepunt Media). A cold open of kinetic
type (for · the · love · of → "print party" typed on a typewriter → the Promenader mark on the drop),
then the print-party poster builds itself on the beat, piece by piece, and holds so it can be read.

## Arc (seconds)

- 0–2: four words, four colour cards (cyan, magenta, yellow, blue), one per beat, set in MuseoModerno (the Promenader site font).
- 2–4: "print party" typed on a cream card with a carriage-bell ding; the Waterblommetjies rise up and wave.
- 4.0: the drop. The Promenader mark slams onto yellow, then the page is torn away.
- 4.75–9: the poster assembles: sheet, cyan column, beach photo, tape strips, the Waterblommetjies stepping out of the photo, "print party" typed into the magenta block, the headline and wordmark stamp.
- 9.5–14: the what-to-expect list, one item every 1.5 beats (Jessica Fletcher punches in).
- 14–16: Arthur's Mini front page, then the talk line.
- 16.5–19.5: blue band, the giant "pro" rises, date/venue, tickets, "for the love of print".
- 20–22.5: hold; the poster breathes on the beat.
- 22.5: magenta + yellow panels sweep across to the end card (when & where).
- 23–24: the sun-and-sea circle from the logo rolls in like a wheel; the wordmark unfolds out of it both ways.
- 24–25: "print party" typed over a yellow highlighter strip.
- 25–27: a stylised map card lands: sea, street grid drawing on, Loop St lit yellow (Bree St / Long St either side), then a dashed route from Sea Point along the coast to the venue.
- 27.5: the pin (the logo circle in its head) drops on 61 Loop St on the beat, squashes, and ripples every beat; the @toneelhuis / 61 Loop St tag pops out.
- 28–30: blue band: Sunday 25 Oct · 4pm, tickets on Quicket @ R200 (copy of Promenader + Seepunt hat), "for the love of print", Toneelhuis mark.
- 30–31: final hit, hold.

The map is stylised, not surveyed: a diagonal CBD grid with Loop St between Bree and Long.

## Other formats

`scripts/make_variants.py` generates `index-9x16.html` (stories/reels, 1080×1920) and `index-16x9.html`
(YouTube, 1920×1080) from index.html: the 4:5 poster sits inside, intro cards and wipes go full-bleed.
- 9:16: poster centred; two ticker tapes above and below (in the platform UI zones, so decoration only).
- 16:9: poster scaled 0.8 in the middle; vertical Promenader wordmark on the left, a big Sunday / 25 / Oct / 4pm / @toneelhuis / 61 Loop St column on the right.
Edit index.html, then `npm run variants && npm run render:9x16 && npm run render:16x9`.

## Assets

Everything is pulled from the designer's poster PDF (Volume 2 launch, 800×800 Instagram post 45),
so the layout matches it 1:1 (PDF points × 4/3 = px):

- assets/paper.jpg: crumpled paper backdrop (baked at 50% over ink, as in the PDF)
- assets/beach.jpg, assets/waterblommetjies.png: photo + alpha cutout (the cutout overlaps the tape)
- assets/wordmark.png, assets/wordmark-tagline.png: Promenader marks (the tagline one doubles as the giant "pro")
- assets/front-page.jpg, assets/jessica.jpg, assets/tb.png
- assets/o-mark.png, assets/wordmark-no-o.png: the logo circle cut out of the wordmark (centre 248,121, r≈69 in the 1080px source) for the end-card roll-in
- assets/fonts/*-subset.ttf: the poster's own fonts (LumiosTW Old/New/Used/Tape, Major Mono Display, Libre Baskerville Italic), **subset to the poster's glyphs only**. New copy in those faces falls back to Special Elite / Libre Baskerville.
- assets/fonts/museomoderno-latin-800-normal.woff2: MuseoModerno, the Promenader font from the seepunt site
- assets/vendor/gsap.min.js: vendored (the render sandbox can't reach the CDN)

## Audio

`scripts/build_audio.py` builds assets/audio/track.mp3 = music bed + SFX bus (typewriter clacks, bell,
tape slaps, stamps; cues mirror the GSAP timeline). With no `assets/audio/elevenlabs.mp3` it synthesises
a temp 120 BPM disco-funk bed. `ELEVENLABS_API_KEY=… npm run music` generates the ElevenLabs bed and
rebuilds the mix. Then `npm run render`.
