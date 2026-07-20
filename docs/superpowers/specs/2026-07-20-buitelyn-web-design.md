# Buitelyn Web — Design

**Date:** 2026-07-20
**Status:** Approved
**Reference:** aitsa hero pattern (`~/aitsa/web/components/hero.tsx`, live at www.aitsa.tech); Substack feed https://buitelyn.substack.com/feed

## Goal

A one-page Buitelyn website: aitsa-style split hero (headline left, presenter
duo cutout ringed by floating brand chips right), a scrolling headline ticker,
and the Substack RSS feed rendered as **Die Voorblad** — a living newspaper
front page. Posts link out to Substack (front-door model; Substack keeps the
subscribe funnel).

## Decisions

- Location: `web/` inside the buitelyn repo (github.com/pieterbothma/buitelyn); Vercel deploy with root directory `web/`.
- Stack: Next.js App Router + Tailwind + thin shadcn (init + brand tokens mapped to CSS variables; NO Radix components shipped initially).
- Data: server-side RSS fetch with ISR (`revalidate = 600`); `fast-xml-parser`; no client-side fetching.
- Reading happens on Substack; all post links open buitelyn.substack.com in a new tab.
- Light/paper is canonical (brand overrides dark-mode-first preference).
- Language: Afrikaans throughout; dates via `Intl.DateTimeFormat("af-ZA")`.

## Brand tokens

Paper `#EBEAE6`, off-white `#F7F6F2`, ink `#1A1A1A`, red `#F03028`, green
`#0E8345` (market/NUUT accents only). Font: League Spartan (next/font,
weights 400–800). Flat surfaces, hairline ink rules, zero radius, zero
shadows (drop-shadows only on floating hero chips, per aitsa).

## Page structure (route `/`)

1. **Top bar** — small boxed logo mark left; "Teken in →" link right (Substack); hairline bottom border.
2. **Hero** — grid `[1.05fr_1fr]` md+: left = display headline (League Spartan 800, tight tracking) "Buitelyn." + red accent line "Ons trek die lyne." + tagline paragraph (from the feed's channel description) + CTAs ("Lees die nuutste uitgawe →" → newest post URL; "Teken in op Substack"). Right = André-Pierre headshot cutout (`apdup.png`, bg removed, supplied by user) on off-white square, with market indicators and news-section chips floating around his head at slight rotations (ticker chips `JSE ▲ +1,2%`, `R/$ ▼ 18,42`, `GOUD ▲ +0,4%`; tags `MARKTE`, `POLITIEK`, `RENTEKOERS`; one red dot disc) — mirroring aitsa's AI icons around Piet. Mobile: chips in a row beneath the portrait.
3. **Headline ticker** — thin full-width strip, hairline rules top+bottom; post titles scroll right-to-left via CSS marquee animation (duplicated list, `animation-play-state: paused` on hover, static row under `prefers-reduced-motion`). Green ▲ before titles ≤7 days old; red dot separators.
4. **Die Voorblad** — section headed by a double-rule masthead: "Die Buitelyn" display + auto dateline `MAANDAG 20 JULIE 2026 · BUITELYN.SUBSTACK.COM` (Afrikaans weekday/month, uppercase). Lead story = newest post: cover image (next/image), display headline, blurb, small-caps date + read-time ("4 MIN"). Remaining posts in ruled columns (CSS columns or grid with vertical hairlines; 3 cols lg, 2 md, 1 sm): headline (weight 700), blurb (2-line clamp), small-caps date + read-time; every 4th entry shows its thumbnail; hairline rule between entries. All entries `<a target="_blank">` to Substack.
5. **Footer** — hairline top rule; © Buitelyn {year}; "Lees en teken in op Substack →"; red dot full stop.

## Data layer

`lib/feed.ts`:

- `type Post = { title: string; blurb: string; url: string; isoDate: string; image: string | null; author: string; readMinutes: number }`
- `type Channel = { tagline: string; posts: Post[] }`
- `getFeed(): Promise<Channel>` — `fetch("https://buitelyn.substack.com/feed", { next: { revalidate: 600 } })`, parse with `fast-xml-parser` (CDATA on), map items: title, description→blurb, link→url, pubDate→isoDate, enclosure.url→image, dc:creator→author, readMinutes = ceil(words(content:encoded)/220) min 1.
- Handles single-item feeds (XML parser returns object, not array — normalise).
- Throws on network/parse failure; the page catches: with no posts renders masthead + hero + "Lees op Substack →" empty state (no error page). ISR keeps last good render on subsequent failures.

`next.config.ts`: `images.remotePatterns` for `substackcdn.com` and `substack-post-media.s3.amazonaws.com`.

## Testing

- Unit: `lib/feed.test.ts` (vitest) parses a saved fixture (`lib/__fixtures__/feed.xml`, the real feed snapshot): post count, field mapping of first post, read-time > 0, single-item normalisation.
- Visual: run dev server, verify in a real browser at desktop + mobile widths (hero, ticker motion, voorblad columns, links).

## Out of scope

Subscribe embed, presenters section, watch/episodes section, dark mode, post
pages on-site, custom domain wiring (later: buitelyn.co.za or similar on
Vercel).
