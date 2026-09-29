---
workflow: motion-graphics
message: "What to expect at the Promenader print party — Sunday 25 Oct, 4pm, @toneelhuis, 61 Loop St. Tickets on Quicket, R200."
destination: instagram (feed, 4:5)
aspect: 1080x1350
length: 24s @ 30fps
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
- 20–24: hold; the poster breathes on the beat.

## Assets

Everything is pulled from the designer's poster PDF (Volume 2 launch, 800×800 Instagram post 45),
so the layout matches it 1:1 (PDF points × 4/3 = px):

- assets/paper.jpg: crumpled paper backdrop (baked at 50% over ink, as in the PDF)
- assets/beach.jpg, assets/waterblommetjies.png: photo + alpha cutout (the cutout overlaps the tape)
- assets/wordmark.png, assets/wordmark-tagline.png: Promenader marks (the tagline one doubles as the giant "pro")
- assets/front-page.jpg, assets/jessica.jpg, assets/tb.png
- assets/fonts/*-subset.ttf: the poster's own fonts (LumiosTW Old/New/Used/Tape, Major Mono Display, Libre Baskerville Italic), **subset to the poster's glyphs only**. New copy in those faces falls back to Special Elite / Libre Baskerville.
- assets/fonts/museomoderno-latin-800-normal.woff2: MuseoModerno, the Promenader font from the seepunt site
- assets/vendor/gsap.min.js: vendored (the render sandbox can't reach the CDN)

## Audio

`scripts/build_audio.py` builds assets/audio/track.mp3 = music bed + SFX bus (typewriter clacks, bell,
tape slaps, stamps; cues mirror the GSAP timeline). With no `assets/audio/elevenlabs.mp3` it synthesises
a temp 120 BPM disco-funk bed. `ELEVENLABS_API_KEY=… npm run music` generates the ElevenLabs bed and
rebuilds the mix. Then `npm run render`.
