# Buitelyn Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-page Buitelyn site in `web/`: aitsa-style hero, headline ticker, Substack feed as a newspaper front page ("Die Voorblad").

**Architecture:** Next.js App Router, single server-rendered route with ISR (600s). `lib/feed.ts` is the only data layer. Components under `components/`. Brand via Tailwind theme + CSS variables (thin shadcn).

**Tech Stack:** Next.js (latest, App Router, TS), Tailwind v4, fast-xml-parser, vitest, League Spartan via next/font/google.

## Global Constraints

- Path: `/Users/pieterbothma/die buitelyn/web` (space in path — quote in shell).
- Colours only: paper `#EBEAE6`, off-white `#F7F6F2`, ink `#1A1A1A`, red `#F03028`, green `#0E8345` (fresh-post markers only).
- League Spartan everywhere; flat, square, hairline ink rules; no shadows except floating hero chips.
- Afrikaans copy; dates `Intl.DateTimeFormat("af-ZA")` uppercase.
- All post links `target="_blank" rel="noopener noreferrer"` to Substack.
- `prefers-reduced-motion` disables the ticker animation.
- Commit after each task.

---

### Task 1: Scaffold

**Files:** create Next app in `web/`, `web/next.config.ts` (remotePatterns), `web/app/globals.css` (brand tokens), `web/app/layout.tsx` (font + metadata).

- [ ] `cd "…/die buitelyn" && npx create-next-app@latest web --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes`
- [ ] `cd web && npm i fast-xml-parser && npm i -D vitest`
- [ ] `npx shadcn@latest init -y` (defaults; map tokens next)
- [ ] `layout.tsx`: `League_Spartan` from `next/font/google` (`weight: ["400","500","600","700","800"], subsets:["latin"], variable:"--font-spartan"`); `<html lang="af">`; metadata title "Buitelyn — sake, politiek en als tussenin", description = feed tagline; body class `font-spartan bg-paper text-ink antialiased`.
- [ ] `globals.css`: define `--paper #EBEAE6; --offwhite #F7F6F2; --ink #1A1A1A; --brand-red #F03028; --brand-green #0E8345;` map into shadcn vars (`--background: var(--paper); --foreground: var(--ink); --primary: var(--ink); --accent: var(--brand-red)`), Tailwind theme colors `paper/offwhite/ink/red/green` + `fontFamily.spartan`.
- [ ] `next.config.ts` images.remotePatterns: `substackcdn.com`, `substack-post-media.s3.amazonaws.com` (https, any path).
- [ ] Verify: `npm run build` passes. Commit `chore(web): scaffold Next.js app with Buitelyn brand tokens`.

### Task 2: Feed data layer (TDD)

**Files:** `web/lib/feed.ts`, `web/lib/feed.test.ts`, `web/lib/__fixtures__/feed.xml`, `web/package.json` (test script `vitest run`).

**Interfaces (produces):**

```ts
export type Post = { title: string; blurb: string; url: string; isoDate: string; image: string | null; author: string; readMinutes: number };
export type Channel = { tagline: string; posts: Post[] };
export function parseFeed(xml: string): Channel;           // pure, testable
export async function getFeed(): Promise<Channel>;         // fetch + parseFeed, ISR revalidate 600
```

- [ ] Save the live feed as fixture: `curl -s https://buitelyn.substack.com/feed -A "Mozilla/5.0" > lib/__fixtures__/feed.xml`
- [ ] Write failing tests: parses fixture → `tagline` contains "buitelyne"; `posts.length >= 1`; first post has non-empty title/url/isoDate, `readMinutes >= 1`; blurb is plain text; single-item XML (hand-made mini fixture string) still yields an array.
- [ ] Implement `parseFeed` with `XMLParser({ ignoreAttributes: false, cdataPropName: "__cdata" })`; helper `text(v)` unwraps CDATA/objects; normalise `channel.item` to array; `readMinutes = Math.max(1, Math.round(words/220))` from `content:encoded` stripped of tags; `image` from `enclosure["@_url"]` else null; `isoDate = new Date(pubDate).toISOString()`.
- [ ] `getFeed()` = `fetch(FEED_URL, { next: { revalidate: 600 }, headers: { "user-agent": "Mozilla/5.0" } })` → `parseFeed(await res.text())`; throw on `!res.ok`.
- [ ] `npx vitest run` → PASS. Commit `feat(web): substack feed parser with tests`.

### Task 3: TopBar, Hero, Ticker

**Files:** `web/components/top-bar.tsx`, `web/components/hero.tsx`, `web/components/ticker.tsx`; copy `~/Downloads/apdupbgremoved.png` → `web/public/apdup.png` (hero portrait: André-Pierre headshot cutout, per user), `videos/buitelyn-launch/assets/logo-square.png` → `web/public/logo-square.png`.

- [ ] **TopBar**: full-width, hairline bottom (`border-b border-ink/15`); inner max-w-[1440px]; left = mini logo lockup (Image logo-square.png h-10 w-10) + "Buitelyn" 700; right = `Teken in →` link to `https://buitelyn.substack.com/subscribe`, 600, underline on hover.
- [ ] **Hero** (server component, props `{ tagline: string; latestUrl: string }`): grid `md:grid-cols-[1.05fr_1fr]` gap-14, pt-14 pb-16; left: h1 League Spartan 800 `leading-[0.94] tracking-[-0.05em] text-[64px] md:text-[92px]`: `Buitelyn.` ink, next line `Ons trek` + red `die lyne.`; tagline paragraph `text-ink/70 max-w-xl text-lg`; CTAs: primary flat ink button (`bg-ink text-offwhite px-5 h-12`, square) "Lees die nuutste uitgawe →" href latestUrl new tab; secondary text link "Teken in op Substack". Right: off-white square (`aspect-square bg-offwhite`) with the André-Pierre headshot cutout (`/apdup.png`, Image `object-contain fill`), market/news CHIPS floating around his HEAD (upper half of the square — mirror of aitsa's AI icons), absolutely positioned, rotations ±4–10°, `drop-shadow-[0_6px_16px_rgba(26,26,26,0.15)]`, desktop `hidden md:block`:

```tsx
const CHIPS: Chip[] = [
  { label: "JSE",  arrow: "up",   value: "+1,2%", top: "4%",  left: "-8%",  rotate: -8 },
  { label: "R/$",  arrow: "down", value: "18,42", top: "-5%", left: "70%",  rotate: 6 },
  { label: "GOUD", arrow: "up",   value: "+0,4%", top: "30%", left: "86%",  rotate: -4 },
  { label: "MARKTE",    top: "26%", left: "-12%", rotate: -9 },
  { label: "POLITIEK",  top: "58%", left: "90%",  rotate: 5 },
  { label: "RENTEKOERS", top: "62%", left: "-14%", rotate: 7 },
];
```

  Chip = off-white plate, 2px ink border, px-3 py-2, 600 tracking-wide text-sm; `market` chip renders ▲ as a green CSS triangle span + green value. One free-floating red dot disc (size-6 rounded-full bg-red) top-right of the portrait. Mobile: chips row (flex wrap, no absolute) beneath portrait.
- [ ] **Ticker** (props `{ posts: Post[] }`): outer `border-y border-ink/20 overflow-hidden py-3`; inner flex `w-max animate-ticker hover:[animation-play-state:paused]` containing the headline list TWICE (aria-hidden on the duplicate) for a seamless loop; item = optional green ▲ (posts ≤7 days), title 600, red dot `·` separator. In globals.css:

```css
@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.animate-ticker { animation: ticker 40s linear infinite; }
@media (prefers-reduced-motion: reduce) { .animate-ticker { animation: none; } }
```

- [ ] Verify: components compile (`npm run build`). Commit `feat(web): top bar, hero with floating chips, headline ticker`.

### Task 4: Voorblad, Footer, page assembly

**Files:** `web/components/voorblad.tsx`, `web/components/footer.tsx`, `web/app/page.tsx`.

- [ ] **Voorblad** (props `{ posts: Post[] }`): section max-w-[1440px] px-6 md:px-14 py-14. Masthead: double rule (two stacked 2px ink bars 4px apart), between them a row: display "Die Buitelyn" (800, ~40px) left, dateline right — `new Intl.DateTimeFormat("af-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())` uppercased + " · BUITELYN.SUBSTACK.COM", `text-xs tracking-[0.2em] text-ink/60`. Lead story (posts[0]): grid md 2-col — big Image (aspect-[4/3], cover, hairline border) + headline 800 text-4xl/5xl hover:underline, blurb text-ink/70, meta row small-caps `12 MEI 2026 · 4 MIN` with red dot before it. Column stories (posts.slice(1)): `columns-1 md:columns-2 lg:columns-3 gap-10` with `[column-rule:1px_solid_rgba(26,26,26,0.15)]`; each entry `break-inside-avoid border-b border-ink/15 pb-5 mb-5`: headline 700 text-xl hover:underline, blurb `line-clamp-2 text-ink/65 text-sm`, meta small-caps text-xs; every 4th entry (index % 4 === 2) renders its thumbnail above the headline. Whole entry wrapped in `<a target="_blank">`.
- [ ] **Footer**: hairline top; row: `© Buitelyn {new Date().getFullYear()}` + red dot span + "Lees en teken in op Substack →" link.
- [ ] **page.tsx** (async server component): `export const revalidate = 600;` — `try { const { tagline, posts } = await getFeed(); } catch → empty state`. Render TopBar, Hero(tagline, posts[0]?.url ?? substack root), Ticker(posts), Voorblad(posts), Footer. Empty state (no posts): TopBar + Hero (fallback tagline from spec) + centered "Lees op Substack →" panel + Footer.
- [ ] Verify: `npm run build` clean. Commit `feat(web): voorblad front page, footer, page assembly`.

### Task 5: Browser verification & polish

- [ ] `npm run dev` (background); verify in real browser at 1440px and 390px: hero layout + chips, ticker scrolls and pauses on hover, voorblad columns + rules, dates in Afrikaans, links open Substack, images load.
- [ ] Fix anything visually off (spacing, chip positions over the cutout, clamp lengths).
- [ ] `npx vitest run` + `npm run build` final green. Commit `polish(web): visual pass`. Push.
