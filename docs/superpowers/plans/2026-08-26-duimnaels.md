# Duimnaels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Duimnael tool in Buitelyn-Studio where AP picks a reaction shot, uploads reference images of today's subjects to have `gpt-image-2` generate a backdrop, and then drags text and the logo into place on a 1280×720 YouTube thumbnail.

**Architecture:** A new `lib/duimnael/` module that mirrors the proven `lib/kaart/` shape — client-safe types and geometry in `spec.ts` / `laag.ts` / `gloed.ts`, a server-only satori renderer in `render.tsx`. The drag overlay and the renderer call the *same* geometry function, so position is data on a spec, never baked pixels. AP is composited as a fixed transparent cutout; only the backdrop is AI-generated.

**Tech Stack:** Next.js (App Router), React, TypeScript, satori via `next/og`, `sharp`, Supabase Storage, OpenAI `gpt-image-2`, Replicate (background removal), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-26-duimnaels-design.md`

## Global Constraints

- **Working directory is `admin/`.** Every path below is relative to `die buitelyn/admin/`. Run every command from there.
- **Tests:** `npx vitest run <path>`. Full suite: `npm test`. Lint: `npm run lint`.
- **Client/server boundary is enforced by ESLint, not convention.** `lib/duimnael/render.tsx` imports `next/og`, which pulls in satori + resvg + yoga.wasm. If a `"use client"` component imports it, all of that lands in the browser bundle **and the build still passes silently**. Task 4 adds the `no-restricted-imports` rule that blocks this.
- **Never WebP.** satori decodes it unreliably and the image comes out silently blank. Reject WebP uploads with a 415.
- **Every image entering the system is normalised** to longest side ≤ 1600px, PNG if it has alpha, else JPEG q85. satori re-fetches images on *every* render.
- **Frame is 1280×720.** All positions are `0..1` fractions of the frame, so a spec renders correctly at any output size.
- **Afrikaans** for all user-facing copy, comments and commit messages. Code identifiers stay Afrikaans to match the surrounding module (`kaart`, `beeld`, `vorm`).
- **Brand name is "Buitelyn", never "Die Buitelyn"** — in any copy or asset.
- **Buitelyn red is `#E2231A`.** Logo assets already exist at `assets/logo-ink.png` and `assets/logo-wit.png`.

---

### Task 1: The thumbnail spec — client-safe types and normalisation

**Files:**
- Create: `lib/duimnael/spec.ts`
- Test: `lib/duimnael/spec.test.ts`

**Interfaces:**
- Consumes: `BeeldBron` from `@/lib/kaart/spec` (existing).
- Produces: `RAAM`, `Plek`, `Gloed`, `GLOED_VERSTEK`, `Laag`, `Duimnael`, `normaliseerDuimnael(rou: unknown): Duimnael`.

- [ ] **Step 1: Write the failing test**

Create `lib/duimnael/spec.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GLOED_VERSTEK, RAAM, normaliseerDuimnael } from "./spec";

describe("RAAM", () => {
  it("is 'n 16:9 YouTube-duimnael", () => {
    expect(RAAM).toEqual({ w: 1280, h: 720 });
  });
});

describe("normaliseerDuimnael", () => {
  it("gee 'n leë duimnael terug vir rommel", () => {
    expect(normaliseerDuimnael(null)).toEqual({ agtergrond: null, lae: [] });
    expect(normaliseerDuimnael("nee")).toEqual({ agtergrond: null, lae: [] });
  });

  it("klem plek-waardes binne 0..1", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "logo", kleur: "wit", plek: { x: 5, y: -3, grootte: 0.1 } }],
    });
    expect(d.lae[0].plek).toEqual({ x: 1, y: 0, grootte: 0.1 });
  });

  it("klem grootte bo 0 sodat 'n laag nooit verdwyn nie", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "logo", kleur: "ink", plek: { x: 0.5, y: 0.5, grootte: 0 } }],
    });
    expect(d.lae[0].plek.grootte).toBeGreaterThan(0);
  });

  it("gooi leë teksblokke weg — hulle render as niks", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [
        { soort: "teks", teks: "   ", kleur: "wit", belyn: "links", plek: { x: 0.1, y: 0.1, grootte: 0.08 } },
        { soort: "teks", teks: "SAKENUUS", kleur: "wit", belyn: "links", plek: { x: 0.1, y: 0.1, grootte: 0.08 } },
      ],
    });
    expect(d.lae).toHaveLength(1);
    expect(d.lae[0]).toMatchObject({ soort: "teks", teks: "SAKENUUS" });
  });

  it("verwerp onbekende laagsoorte in plaas van om hulle deur te laat", () => {
    const d = normaliseerDuimnael({ agtergrond: null, lae: [{ soort: "video", plek: { x: 0, y: 0, grootte: 1 } }] });
    expect(d.lae).toEqual([]);
  });

  it("gee 'n reaksie sy verstek-gloed as daar nie een is nie", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "reaksie", url: "https://x/a.png", wydte: 1024, hoogte: 1024, plek: { x: 0.25, y: 0.5, grootte: 0.5 } }],
    });
    expect(d.lae[0]).toMatchObject({ gloed: GLOED_VERSTEK });
  });

  it("weier 'n data:-URL — satori haal beelde by elke render weer af", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "reaksie", url: "data:image/png;base64,AAA", wydte: 10, hoogte: 10, plek: { x: 0.5, y: 0.5, grootte: 0.5 } }],
    });
    expect(d.lae).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/duimnael/spec.test.ts`
Expected: FAIL — `Failed to resolve import "./spec"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/duimnael/spec.ts`:

```ts
/* Die duimnael-spesifikasie: tipes, afmetings en normalisering.

   KLIËNT-VEILIG — geen JSX, geen next/og. Die redigeerder (client component)
   voer hierdie lêer, laag.ts en gloed.ts in; render.tsx is BEDIENER-ALLEEN.
   Word daardie invoer, sleep satori + resvg + yoga.wasm die blaaier-bundel in,
   en die bou slaag stilweg. */

import type { BeeldBron } from "@/lib/kaart/spec";

export const RAAM = { w: 1280, h: 720 } as const;

/** Waar 'n laag sit. Alles 0..1 van die raam af, dus resolusie-onafhanklik.
 *
 *  `grootte` beteken NIE dieselfde ding vir elke laagsoort nie:
 *    • reaksie en logo → die laag se BREEDTE as breukdeel van die raam s'n;
 *    • teks           → die FONTGROOTTE as breukdeel van die raam se breedte.
 *  Teks se breedte volg uit die woorde en kan nie vooraf vasgestel word nie.
 *  laag.ts los dié verskil op één plek op. */
export type Plek = { x: number; y: number; grootte: number };

/** Die rooi gloed agter AP. Dit is 'n EIENSKAP van die reaksie-laag, nie 'n
 *  aparte laag nie, sodat dit hom volg wanneer hy gesleep word. */
export type Gloed = {
  aan: boolean;
  kleur: string;
  /** 0..1 — dekking in die middel van die gradiënt. */
  sterkte: number;
  /** Breukdeel van die raam se breedte. */
  radius: number;
};

export const GLOED_VERSTEK: Gloed = { aan: true, kleur: "#E2231A", sterkte: 0.85, radius: 0.42 };

export type Laag =
  | { soort: "reaksie"; url: string; wydte: number; hoogte: number; plek: Plek; gloed: Gloed }
  | { soort: "logo"; kleur: "ink" | "wit"; plek: Plek }
  | { soort: "teks"; teks: string; kleur: "wit" | "ink"; belyn: "links" | "middel" | "regs"; plek: Plek };

export type Duimnael = {
  agtergrond: BeeldBron | null;
  /** Render-volgorde = skikking-volgorde. */
  lae: Laag[];
};

const LEEG: Duimnael = { agtergrond: null, lae: [] };

function getal(n: unknown, verstek: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : verstek;
}

function klem01(n: unknown, verstek: number): number {
  return Math.min(1, Math.max(0, getal(n, verstek)));
}

/** Grootte mag nooit 0 wees nie: 'n laag met grootte 0 is onsigbaar én
 *  onsleepbaar, so AP kan dit nie weer terugkry nie. */
function klemGrootte(n: unknown): number {
  return Math.min(1, Math.max(0.01, getal(n, 0.2)));
}

function plek(rou: unknown): Plek {
  const p = (rou ?? {}) as Record<string, unknown>;
  return { x: klem01(p.x, 0.5), y: klem01(p.y, 0.5), grootte: klemGrootte(p.grootte) };
}

function gloed(rou: unknown): Gloed {
  if (rou == null || typeof rou !== "object") return GLOED_VERSTEK;
  const g = rou as Record<string, unknown>;
  return {
    aan: typeof g.aan === "boolean" ? g.aan : GLOED_VERSTEK.aan,
    kleur: typeof g.kleur === "string" && /^#[0-9a-fA-F]{6}$/.test(g.kleur) ? g.kleur : GLOED_VERSTEK.kleur,
    sterkte: klem01(g.sterkte, GLOED_VERSTEK.sterkte),
    radius: Math.min(1.5, Math.max(0.05, getal(g.radius, GLOED_VERSTEK.radius))),
  };
}

/** 'n data:-URL is verbode. satori haal beelde by ELKE render weer af, en 'n
 *  ingebedde base64-string laat die spec megagrepe swaar word. */
function bruikbareUrl(u: unknown): string | null {
  return typeof u === "string" && /^https?:\/\//.test(u) ? u : null;
}

function laag(rou: unknown): Laag | null {
  if (rou == null || typeof rou !== "object") return null;
  const l = rou as Record<string, unknown>;
  switch (l.soort) {
    case "reaksie": {
      const url = bruikbareUrl(l.url);
      const wydte = getal(l.wydte, 0);
      const hoogte = getal(l.hoogte, 0);
      if (!url || wydte <= 0 || hoogte <= 0) return null;
      return { soort: "reaksie", url, wydte, hoogte, plek: plek(l.plek), gloed: gloed(l.gloed) };
    }
    case "logo":
      return { soort: "logo", kleur: l.kleur === "ink" ? "ink" : "wit", plek: plek(l.plek) };
    case "teks": {
      const teks = typeof l.teks === "string" ? l.teks.trim() : "";
      if (!teks) return null;
      return {
        soort: "teks",
        teks,
        kleur: l.kleur === "ink" ? "ink" : "wit",
        belyn: l.belyn === "middel" || l.belyn === "regs" ? l.belyn : "links",
        plek: plek(l.plek),
      };
    }
    default:
      return null;
  }
}

export function normaliseerDuimnael(rou: unknown): Duimnael {
  if (rou == null || typeof rou !== "object") return LEEG;
  const d = rou as Record<string, unknown>;
  const lae = Array.isArray(d.lae) ? d.lae.map(laag).filter((l): l is Laag => l !== null) : [];
  const agtergrond = d.agtergrond && typeof d.agtergrond === "object" ? (d.agtergrond as BeeldBron) : null;
  return { agtergrond: agtergrond && bruikbareUrl(agtergrond.url) ? agtergrond : null, lae };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/duimnael/spec.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/duimnael/spec.ts lib/duimnael/spec.test.ts
git commit -m "feat(duimnael): die duimnael-spec met normalisering en klemming"
```

---

### Task 2: The shared geometry — one function the overlay and the renderer both call

**Files:**
- Create: `lib/duimnael/laag.ts`
- Test: `lib/duimnael/laag.test.ts`

**Interfaces:**
- Consumes: `Laag`, `RAAM` from `./spec` (Task 1).
- Produces: `Gleuf`, `LaagKas`, `laagKas(laag: Laag, raam: Gleuf): LaagKas`.

`LaagKas` fields: `left`, `top`, `width` (all px). `height` is present for `reaksie` and `logo`; `fontSize` is present only for `teks`.

**Anchor rule — this is the one asymmetry, and it is deliberate:**
- `reaksie` and `logo` anchor at their **centre**, because their height is known from the aspect ratio.
- `teks` anchors at its **top edge**, because text height depends on wrapping, which the browser and satori resolve differently. Anchoring at the top means the block grows downward and the anchor stays exactly where AP dropped it.

- [ ] **Step 1: Write the failing test**

Create `lib/duimnael/laag.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { laagKas } from "./laag";
import { GLOED_VERSTEK, RAAM, type Laag } from "./spec";

const reaksie = (plek: { x: number; y: number; grootte: number }): Laag => ({
  soort: "reaksie",
  url: "https://x/ap.png",
  wydte: 1024,
  hoogte: 1024,
  plek,
  gloed: GLOED_VERSTEK,
});

describe("laagKas — reaksie", () => {
  it("sentreer die uitknipsel op sy ankerpunt", () => {
    const k = laagKas(reaksie({ x: 0.25, y: 0.5, grootte: 0.5 }), RAAM);
    expect(k.width).toBe(640);
    expect(k.height).toBe(640);
    expect(k.left).toBe(0); // 0.25*1280 - 320
    expect(k.top).toBe(40); // 0.5*720 - 320
  });

  it("behou die beeld se verhouding — nooit plet nie", () => {
    const hoog: Laag = { ...reaksie({ x: 0.5, y: 0.5, grootte: 0.5 }), wydte: 800, hoogte: 1600 };
    const k = laagKas(hoog, RAAM);
    expect(k.width).toBe(640);
    expect(k.height).toBe(1280);
  });
});

describe("laagKas — logo", () => {
  it("is vierkantig en gesentreer op sy ankerpunt", () => {
    const k = laagKas({ soort: "logo", kleur: "wit", plek: { x: 0.9, y: 0.85, grootte: 0.12 } }, RAAM);
    expect(k.width).toBe(154); // round(0.12*1280)
    expect(k.height).toBe(154);
    expect(k.left).toBe(1075); // round(1152 - 77)
    expect(k.top).toBe(535); // round(612 - 77)
  });
});

describe("laagKas — teks", () => {
  const teks = (belyn: "links" | "middel" | "regs", x: number): Laag => ({
    soort: "teks",
    teks: "SAKENUUS",
    kleur: "wit",
    belyn,
    plek: { x, y: 0.1, grootte: 0.09 },
  });

  it("vertaal grootte na fontgrootte, nie na breedte nie", () => {
    const k = laagKas(teks("links", 0.55), RAAM);
    expect(k.fontSize).toBe(115); // round(0.09*1280)
    expect(k.height).toBeUndefined();
  });

  it("anker links: x is die linkerrand, die blok vloei na regs", () => {
    const k = laagKas(teks("links", 0.55), RAAM);
    expect(k.left).toBe(704);
    expect(k.width).toBe(576); // 1280 - 704
  });

  it("anker regs: x is die regterrand, die blok vloei na links", () => {
    const k = laagKas(teks("regs", 0.95), RAAM);
    expect(k.left).toBe(0);
    expect(k.width).toBe(1216);
  });

  it("anker middel: die blok is simmetries om x en pas altyd in die raam", () => {
    const k = laagKas(teks("middel", 0.5), RAAM);
    expect(k.left).toBe(0);
    expect(k.width).toBe(1280);
    const skeef = laagKas(teks("middel", 0.25), RAAM);
    expect(skeef.left).toBe(0);
    expect(skeef.width).toBe(640); // 2 * min(0.25, 0.75) * 1280
  });

  it("anker bo, nie in die middel nie — die blok groei ondertoe", () => {
    const k = laagKas(teks("links", 0.55), RAAM);
    expect(k.top).toBe(72); // round(0.1*720)
  });

  it("oorleef 'n sleep-rondreis: uit die kas terug na dieselfde x", () => {
    const oorspronklik = 0.55;
    const k = laagKas(teks("links", oorspronklik), RAAM);
    expect(k.left / RAAM.w).toBeCloseTo(oorspronklik, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/duimnael/laag.test.ts`
Expected: FAIL — `Failed to resolve import "./laag"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/duimnael/laag.ts`:

```ts
/* Die meetkunde vir 'n laag in die raam.

   Dit is die ENIGSTE plek waar 'n laag se posisie bereken word — die blaaier
   se sleep-oorlegger EN satori se render roep hierdie funksie, so wat AP sleep
   is presies wat gerender word. Geen canvas, geen gebakte pixels.

   KLIËNT-VEILIG. */

import type { Laag } from "./spec";

export type Gleuf = { w: number; h: number };

export type LaagKas = {
  left: number;
  top: number;
  width: number;
  /** Net vir reaksie en logo — teks se hoogte volg uit die omvou. */
  height?: number;
  /** Net vir teks. */
  fontSize?: number;
};

export function laagKas(laag: Laag, raam: Gleuf): LaagKas {
  const { x, y, grootte } = laag.plek;

  if (laag.soort === "teks") {
    /* Teks anker BO, nie in die middel nie: sy hoogte hang van die omvou af,
       wat die blaaier en satori nie identies oplos nie. Anker bo en die
       ankerpunt bly presies waar AP dit gelos het. */
    const fontSize = Math.round(grootte * raam.w);
    const top = Math.round(y * raam.h);
    switch (laag.belyn) {
      case "links": {
        const left = Math.round(x * raam.w);
        return { left, top, width: raam.w - left, fontSize };
      }
      case "regs": {
        const regterrand = Math.round(x * raam.w);
        return { left: 0, top, width: regterrand, fontSize };
      }
      case "middel": {
        // Simmetries om x, sodat die blok altyd binne die raam bly.
        const half = Math.round(Math.min(x, 1 - x) * raam.w);
        return { left: Math.round(x * raam.w) - half, top, width: half * 2, fontSize };
      }
    }
  }

  // reaksie en logo: die hoogte is bekend, dus anker ons in die middel.
  const width = Math.round(grootte * raam.w);
  const height = laag.soort === "logo" ? width : Math.round((width * laag.hoogte) / laag.wydte);
  return {
    left: Math.round(x * raam.w - width / 2),
    top: Math.round(y * raam.h - height / 2),
    width,
    height,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/duimnael/laag.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/duimnael/laag.ts lib/duimnael/laag.test.ts
git commit -m "feat(duimnael): gedeelde laag-meetkunde vir oorlegger en renderaar"
```

---

### Task 3: The red glow — a deterministic SVG gradient that follows AP

**Files:**
- Create: `lib/duimnael/gloed.ts`
- Test: `lib/duimnael/gloed.test.ts`

**Interfaces:**
- Consumes: `Gloed`, `Laag` from `./spec`; `Gleuf`, `LaagKas` from `./laag`.
- Produces: `gloedKas(laag, raam): LaagKas | null`, `gloedSvgUrl(gloed: Gloed): string`.

`gloedSvgUrl` returns a `data:image/svg+xml,...` URL. This is the one place a `data:` URL is allowed — it is a few hundred bytes of generated markup, not an embedded photo, and it never touches the spec.

- [ ] **Step 1: Write the failing test**

Create `lib/duimnael/gloed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gloedKas, gloedSvgUrl } from "./gloed";
import { GLOED_VERSTEK, RAAM, type Laag } from "./spec";

const reaksie = (gloed = GLOED_VERSTEK): Laag => ({
  soort: "reaksie",
  url: "https://x/ap.png",
  wydte: 1024,
  hoogte: 1024,
  plek: { x: 0.25, y: 0.5, grootte: 0.5 },
  gloed,
});

describe("gloedKas", () => {
  it("sentreer die gloed op dieselfde ankerpunt as die reaksie", () => {
    const k = gloedKas(reaksie(), RAAM)!;
    const middelX = k.left + k.width / 2;
    const middelY = k.top + k.height! / 2;
    expect(middelX).toBeCloseTo(0.25 * RAAM.w, 0);
    expect(middelY).toBeCloseTo(0.5 * RAAM.h, 0);
  });

  it("is vierkantig met deursnee 2 × radius", () => {
    const k = gloedKas(reaksie(), RAAM)!;
    expect(k.width).toBe(Math.round(GLOED_VERSTEK.radius * 2 * RAAM.w));
    expect(k.height).toBe(k.width);
  });

  it("gee null wanneer die gloed af is", () => {
    expect(gloedKas(reaksie({ ...GLOED_VERSTEK, aan: false }), RAAM)).toBeNull();
  });

  it("gee null vir 'n laag wat nie 'n reaksie is nie", () => {
    const logo: Laag = { soort: "logo", kleur: "wit", plek: { x: 0.5, y: 0.5, grootte: 0.1 } };
    expect(gloedKas(logo, RAAM)).toBeNull();
  });
});

describe("gloedSvgUrl", () => {
  it("bou 'n data:-SVG met die gevraagde kleur", () => {
    const url = gloedSvgUrl({ ...GLOED_VERSTEK, kleur: "#E2231A" });
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(url)).toContain("#E2231A");
    expect(decodeURIComponent(url)).toContain("radialGradient");
  });

  it("verval na deursigtig aan die rand sodat daar geen harde sirkel is nie", () => {
    const svg = decodeURIComponent(gloedSvgUrl(GLOED_VERSTEK));
    expect(svg).toContain('stop-opacity="0"');
  });

  it("gebruik die sterkte as die middelpunt se dekking", () => {
    const svg = decodeURIComponent(gloedSvgUrl({ ...GLOED_VERSTEK, sterkte: 0.5 }));
    expect(svg).toContain('stop-opacity="0.5"');
  });

  it("enkodeer die URL sodat # en < nooit rou deurgaan nie", () => {
    const url = gloedSvgUrl(GLOED_VERSTEK);
    expect(url).not.toContain("#");
    expect(url).not.toContain("<");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/duimnael/gloed.test.ts`
Expected: FAIL — `Failed to resolve import "./gloed"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/duimnael/gloed.ts`:

```ts
/* Die rooi gloed agter AP.

   Deterministies, nie KI nie. 'n Gevraagde "altyd" kan nie aan 'n model
   uitbestee word nie: 'n gradiënt is identies elke keer, kos niks, en wys
   dadelik in die voorskou terwyl AP sleep.

   KLIËNT-VEILIG. */

import type { Gleuf, LaagKas } from "./laag";
import type { Gloed, Laag } from "./spec";

/** Waar die gloed sit — dieselfde ankerpunt as die reaksie, want 'n gloed wat
 *  nie sy mens volg nie is net 'n kol op die agtergrond. */
export function gloedKas(laag: Laag, raam: Gleuf): LaagKas | null {
  if (laag.soort !== "reaksie" || !laag.gloed.aan) return null;
  const deursnee = Math.round(laag.gloed.radius * 2 * raam.w);
  return {
    left: Math.round(laag.plek.x * raam.w - deursnee / 2),
    top: Math.round(laag.plek.y * raam.h - deursnee / 2),
    width: deursnee,
    height: deursnee,
  };
}

/** 'n data:-SVG radiale gradiënt. Dit is die een plek waar 'n data:-URL reg is:
 *  'n paar honderd grepe gegenereerde opmaak, nooit 'n ingebedde foto nie, en
 *  dit raak nooit die spec nie. */
export function gloedSvgUrl(gloed: Gloed): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${gloed.kleur}" stop-opacity="${gloed.sterkte}"/>` +
    `<stop offset="55%" stop-color="${gloed.kleur}" stop-opacity="${(gloed.sterkte * 0.35).toFixed(3)}"/>` +
    `<stop offset="100%" stop-color="${gloed.kleur}" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<rect width="100" height="100" fill="url(%23g)"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
```

Note: `url(%23g)` is written pre-encoded because `encodeURIComponent` leaves `#` untouched inside the `url()` reference, which would break the fragment.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/duimnael/gloed.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/duimnael/gloed.ts lib/duimnael/gloed.test.ts
git commit -m "feat(duimnael): deterministiese rooi gloed wat AP volg"
```

---

### Task 4: The renderer — satori composite, plus the ESLint guard

**Files:**
- Create: `lib/duimnael/render.tsx`
- Modify: `eslint.config.mjs:26-45`
- Test: `lib/duimnael/render.test.ts`

**Interfaces:**
- Consumes: `Duimnael`, `RAAM` from `./spec`; `laagKas` from `./laag`; `gloedKas`, `gloedSvgUrl` from `./gloed`; `beeldPlasing` from `@/lib/kaart/beeld`.
- Produces: `renderDuimnael(duimnael: Duimnael, skaal?: number): Promise<Buffer>`.

- [ ] **Step 1: Write the failing test**

Create `lib/duimnael/render.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { renderDuimnael } from "./render";
import { GLOED_VERSTEK, RAAM, normaliseerDuimnael, type Duimnael } from "./spec";

/* Uitleg-regressietoetse deur hashes, want satori waarsku NOOIT oor uitleg
 * nie — dit skuif net stil. 'n Kaart met 'n verkeerde uitleg het voorheen
 * tsc, eslint én next build skoon deurgekom. Net 'n gerenderde vergelyking
 * het dit gevang.
 *
 * Faal 'n hash: is die verandering BEDOEL? Render dit en KYK daarna voordat
 * jy die nuwe waarde inplak. */

const leeg: Duimnael = { agtergrond: null, lae: [] };

const vol = normaliseerDuimnael({
  agtergrond: null,
  lae: [
    {
      soort: "reaksie",
      url: "https://example.invalid/ap.png",
      wydte: 1024,
      hoogte: 1024,
      plek: { x: 0.25, y: 0.55, grootte: 0.55 },
      gloed: GLOED_VERSTEK,
    },
    { soort: "teks", teks: "SAKENUUS", kleur: "wit", belyn: "links", plek: { x: 0.5, y: 0.08, grootte: 0.09 } },
    { soort: "teks", teks: "HERDEFINIEER", kleur: "wit", belyn: "links", plek: { x: 0.5, y: 0.22, grootte: 0.09 } },
  ],
});

describe("renderDuimnael", () => {
  it("render 'n leë duimnael op presies 1280×720", async () => {
    const png = await renderDuimnael(leeg);
    expect(png.length).toBeGreaterThan(0);
    // PNG IHDR: breedte en hoogte is groot-endiaan op greep 16..24.
    expect(png.readUInt32BE(16)).toBe(RAAM.w);
    expect(png.readUInt32BE(20)).toBe(RAAM.h);
  });

  it("skaal die hele boom vir 'n voorskou", async () => {
    const png = await renderDuimnael(leeg, 0.5);
    expect(png.readUInt32BE(16)).toBe(RAAM.w / 2);
    expect(png.readUInt32BE(20)).toBe(RAAM.h / 2);
  });

  it("is deterministies — dieselfde spec gee dieselfde grepe", async () => {
    const a = await renderDuimnael(vol);
    const b = await renderDuimnael(vol);
    expect(createHash("sha256").update(a).digest("hex")).toBe(
      createHash("sha256").update(b).digest("hex")
    );
  });

  it("teks verander die uitset — die lae word werklik geteken", async () => {
    const sonder = await renderDuimnael({ ...vol, lae: vol.lae.filter((l) => l.soort !== "teks") });
    const met = await renderDuimnael(vol);
    expect(createHash("sha256").update(sonder).digest("hex")).not.toBe(
      createHash("sha256").update(met).digest("hex")
    );
  });

  it("die gloed verander die uitset wanneer dit aangeskakel word", async () => {
    const af = normaliseerDuimnael({
      ...vol,
      lae: vol.lae.map((l) => (l.soort === "reaksie" ? { ...l, gloed: { ...GLOED_VERSTEK, aan: false } } : l)),
    });
    const a = await renderDuimnael(af);
    const b = await renderDuimnael(vol);
    expect(createHash("sha256").update(a).digest("hex")).not.toBe(
      createHash("sha256").update(b).digest("hex")
    );
  });
});
```

Note: the reaction URL is deliberately unresolvable (`example.invalid`). satori draws a broken/empty image box rather than throwing, which keeps the test hermetic — no network in CI. The glow is an inline `data:` SVG and *does* render, which is what the last two assertions actually prove.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/duimnael/render.test.ts`
Expected: FAIL — `Failed to resolve import "./render"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/duimnael/render.tsx`:

```tsx
/* Die duimnael-renderaar.

   BEDIENER-ALLEEN: hierdie module voer next/og in, wat satori + resvg +
   yoga.wasm saambring. Word dit ooit uit 'n "use client"-komponent ingevoer,
   land al daardie kode in die blaaierbundel — en die bou SLAAG, so niks kla
   nie. Die redigeerder voer spec.ts, laag.ts en gloed.ts in, nooit hierdie
   lêer nie (afgedwing deur no-restricted-imports in eslint.config.mjs). */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";

import { beeldPlasing } from "@/lib/kaart/beeld";
import { gloedKas, gloedSvgUrl } from "./gloed";
import { laagKas } from "./laag";
import { RAAM, type Duimnael, type Laag } from "./spec";

/* Fonte is voorheen by ELKE versoek van skyf gelees. Met 'n lewendige
   voorskou wat by elke sleutelaanslag herrender, is dit die goedkoopste wins. */
let fonteKas: Promise<{ bold: Buffer }> | null = null;

function laaiFonte() {
  fonteKas ??= (async () => {
    const bold = await readFile(path.join(process.cwd(), "assets/LeagueSpartan-700.ttf"));
    return { bold };
  })();
  return fonteKas;
}

const LOGO_URL: Record<"ink" | "wit", string> = {
  ink: "/logo-ink.png",
  wit: "/logo-wit.png",
};

function teken(laag: Laag, sleutel: number, basis: string): ReactNode {
  const k = laagKas(laag, RAAM);

  if (laag.soort === "teks") {
    return (
      <div
        key={sleutel}
        style={{
          position: "absolute",
          left: k.left,
          top: k.top,
          width: k.width,
          display: "flex",
          flexDirection: "column",
          fontFamily: "LeagueSpartan",
          fontWeight: 700,
          fontSize: k.fontSize,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: laag.kleur === "wit" ? "#FFFFFF" : "#111111",
          textAlign: laag.belyn === "middel" ? "center" : laag.belyn === "regs" ? "right" : "left",
          textShadow: laag.kleur === "wit" ? "0 4px 18px rgba(0,0,0,0.55)" : "none",
        }}
      >
        {laag.teks}
      </div>
    );
  }

  const bron = laag.soort === "logo" ? `${basis}${LOGO_URL[laag.kleur]}` : laag.url;
  return (
    <img
      key={sleutel}
      src={bron}
      width={k.width}
      height={k.height}
      style={{ position: "absolute", left: k.left, top: k.top, objectFit: "contain" }}
    />
  );
}

export async function renderDuimnael(duimnael: Duimnael, skaal = 1): Promise<Buffer> {
  const { bold } = await laaiFonte();
  const s = skaal > 0 && skaal <= 1 ? skaal : 1;
  const basis = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const agtergrond = duimnael.agtergrond
    ? beeldPlasing(duimnael.agtergrond, { w: RAAM.w, h: RAAM.h })
    : null;

  const boom = (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: RAAM.w,
        height: RAAM.h,
        overflow: "hidden",
        backgroundColor: "#0B0B0B",
      }}
    >
      {duimnael.agtergrond && agtergrond ? (
        <img
          src={duimnael.agtergrond.url}
          width={agtergrond.width}
          height={agtergrond.height}
          style={{ position: "absolute", left: agtergrond.left, top: agtergrond.top }}
        />
      ) : null}

      {duimnael.lae.map((laag, i) => {
        const g = gloedKas(laag, RAAM);
        /* Die gloed word SAAM met sy reaksie geteken, net daaronder, sodat dit
           hom volg wanneer hy gesleep word. */
        return (
          <div key={`groep-${i}`} style={{ display: "flex" }}>
            {g && laag.soort === "reaksie" ? (
              <img
                src={gloedSvgUrl(laag.gloed)}
                width={g.width}
                height={g.height}
                style={{ position: "absolute", left: g.left, top: g.top }}
              />
            ) : null}
            {teken(laag, i, basis)}
          </div>
        );
      })}
    </div>
  );

  /* Halfskaal-voorskou: die kode bly in EEN vaste 1280-koördinaatstelsel en ons
     skaal die hele boom. transform + transformOrigin werk in satori, en 'n
     halwe render is 'n kwart van die rasteriseringswerk. */
  const wortel =
    s === 1 ? (
      boom
    ) : (
      <div
        style={{
          display: "flex",
          width: RAAM.w,
          height: RAAM.h,
          transform: `scale(${s})`,
          transformOrigin: "top left",
        }}
      >
        {boom}
      </div>
    );

  const res = new ImageResponse(wortel, {
    width: Math.round(RAAM.w * s),
    height: Math.round(RAAM.h * s),
    fonts: [{ name: "LeagueSpartan", data: bold, weight: 700 }],
  });
  return Buffer.from(await res.arrayBuffer());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/duimnael/render.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Copy the logo assets into `public/` so satori can fetch them by URL**

satori resolves `<img src>` over HTTP; it cannot read `assets/` from disk. The logos exist at `assets/logo-ink.png` and `assets/logo-wit.png` but are only reachable to `sharp`.

```bash
cp assets/logo-ink.png public/logo-ink.png
cp assets/logo-wit.png public/logo-wit.png
```

- [ ] **Step 6: Extend the ESLint guard to the new module**

In `eslint.config.mjs`, in the `files: ["lib/kaart/**/*.tsx", "lib/*-render.tsx"]` block, change the pattern to also cover the new renderer:

```js
  {
    files: ["lib/kaart/**/*.tsx", "lib/duimnael/**/*.tsx", "lib/*-render.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
```

And in the `files: ["components/**/*.ts", "components/**/*.tsx"]` block, add the duimnael renderer to the restricted `group` array:

```js
              group: [
                "@/lib/kaart/render",
                "@/lib/kaart/raam",
                "@/lib/kaart/styles/*",
                "@/lib/kaart-render",
                "@/lib/duimnael/render",
              ],
              message:
                "Bediener-alleen: dit sleep satori/resvg/yoga.wasm die blaaierbundel in. Gebruik @/lib/duimnael/spec, laag of gloed.",
```

- [ ] **Step 7: Verify lint passes and the guard actually bites**

Run: `npm run lint`
Expected: clean.

Now prove the guard works. Temporarily add this line at the top of `components/shell.tsx`:

```ts
import { renderDuimnael } from "@/lib/duimnael/render";
```

Run: `npm run lint`
Expected: FAIL with "Bediener-alleen: dit sleep satori/resvg/yoga.wasm die blaaierbundel in."

**Remove that import line again**, then re-run `npm run lint` and expect clean. A guard that has never been seen to fail is not a guard.

- [ ] **Step 8: Commit**

```bash
git add lib/duimnael/render.tsx lib/duimnael/render.test.ts eslint.config.mjs public/logo-ink.png public/logo-wit.png
git commit -m "feat(duimnael): satori-renderaar plus die bediener-alleen-hek"
```

---

### Task 5: Storage buckets

**Files:**
- Create: `supabase/migrations/20260826000001_duimnael.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826000001_duimnael.sql`:

```sql
-- Duimnaels: KI-agtergronde en klaar duimnaels, publiek bedien sodat satori
-- hulle by render-tyd kan haal en AP hulle direk kan aflaai.
insert into storage.buckets (id, name, public) values ('duimnael', 'duimnael', true)
on conflict (id) do nothing;

-- Die reaksie-biblioteek: deursigtige PNG-uitknipsels van AP. Apart van
-- 'duimnael' omdat dit langlewend is — dit word gesaai, nie per episode
-- weggegooi nie.
insert into storage.buckets (id, name, public) values ('duimnael-reaksies', 'duimnael-reaksies', true)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply it**

Apply through whatever path this repo already uses for migrations (the same way `20260728000005_konsep_fotos.sql` was applied). Verify in the Supabase dashboard that both buckets exist and are public.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260826000001_duimnael.sql
git commit -m "feat(duimnael): emmers vir agtergronde en die reaksie-biblioteek"
```

---

### Task 6: The backdrop route — gpt-image-2 from reference images

**Files:**
- Create: `app/api/duimnael/agtergrond/route.ts`
- Test: `app/api/duimnael/agtergrond/route.test.ts`

**Interfaces:**
- Produces: `POST /api/duimnael/agtergrond`, `multipart/form-data` with `prompt` (string) and 1–4 `verwysing` files. Returns `{ ok: true, url, wydte, hoogte }` or `{ fout }`.
- Also exports `VERSTEK_PROMPT: string` for the editor to preload.

- [ ] **Step 1: Write the failing test**

Create `app/api/duimnael/agtergrond/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({ auth: { getUser } }),
}));

const upload = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: () => ({ storage: { from: () => ({ upload }) } }),
}));

import { POST, VERSTEK_PROMPT } from "./route";

function versoek(velde: Record<string, string>, lêers: number = 1): Request {
  const vorm = new FormData();
  for (const [k, v] of Object.entries(velde)) vorm.append(k, v);
  for (let i = 0; i < lêers; i++) {
    vorm.append("verwysing", new File([new Uint8Array([1, 2, 3])], `r${i}.png`, { type: "image/png" }));
  }
  return new Request("http://t/api/duimnael/agtergrond", { method: "POST", body: vorm });
}

afterEach(() => {
  vi.restoreAllMocks();
  getUser.mockReset();
  upload.mockReset();
});

describe("POST /api/duimnael/agtergrond", () => {
  it("weier 'n versoek sonder sessie", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(versoek({ prompt: "iets" }));
    expect(res.status).toBe(401);
  });

  it("weier 'n leë prompt", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const res = await POST(versoek({ prompt: "   " }));
    expect(res.status).toBe(400);
  });

  it("weier wanneer daar geen verwysingsbeeld is nie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const res = await POST(versoek({ prompt: "iets" }, 0));
    expect(res.status).toBe(400);
    expect((await res.json()).fout).toMatch(/verwysing/i);
  });

  it("weier WebP — satori dekodeer dit nie en die duimnael kom stil blank uit", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const vorm = new FormData();
    vorm.append("prompt", "iets");
    vorm.append("verwysing", new File([new Uint8Array([1])], "r.webp", { type: "image/webp" }));
    const res = await POST(new Request("http://t/x", { method: "POST", body: vorm }));
    expect(res.status).toBe(415);
  });

  it("gee 503 wanneer OPENAI_API_KEY ontbreek", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await POST(versoek({ prompt: "iets" }));
    expect(res.status).toBe(503);
  });

  it("gee 502 en die model se liggaam terug wanneer die beeldmodel faal", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "sk-toets");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("stukkend", { status: 400 })));
    const res = await POST(versoek({ prompt: "iets" }));
    expect(res.status).toBe(502);
    expect((await res.json()).fout).toContain("stukkend");
  });

  it("stoor die beeld en gee die publieke URL terug", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("OPENAI_API_KEY", "sk-toets");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
    // 1x1 deursigtige PNG
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: [{ b64_json: png }] }))
    );
    upload.mockResolvedValue({ error: null });
    const res = await POST(versoek({ prompt: "iets" }));
    expect(res.status).toBe(200);
    const liggaam = await res.json();
    expect(liggaam.ok).toBe(true);
    expect(liggaam.url).toContain("https://sb.test/storage/v1/object/public/duimnael/");
    expect(liggaam.wydte).toBeGreaterThan(0);
    expect(liggaam.hoogte).toBeGreaterThan(0);
  });
});

describe("VERSTEK_PROMPT", () => {
  it("vra geen sterre nie — die drama kom van die gloed", () => {
    expect(VERSTEK_PROMPT.toLowerCase()).not.toContain("star");
  });

  it("verbied mense en teks in die plaat", () => {
    const p = VERSTEK_PROMPT.toLowerCase();
    expect(p).toContain("no people");
    expect(p).toContain("no text");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/duimnael/agtergrond/route.test.ts`
Expected: FAIL — `Failed to resolve import "./route"`.

- [ ] **Step 3: Write minimal implementation**

Create `app/api/duimnael/agtergrond/route.ts`:

```ts
import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const maxDuration = 120; // beeldgenerering vat 30-60s

/* Genereer 'n duimnael-agtergrond uit AP se verwysingsbeelde.

   /v1/images/generations is TEKS-ALLEEN — dit kan nie verwysings neem nie.
   /v1/images/edits met meervoudige image[]-lêers kan wel, en dit is op
   2026-08-26 teen gpt-image-2 gemeet (HTTP 200, bruikbare plaat).

   Val terug na gpt-image-1 as die nuwer model 4xx gee, presies soos
   app/api/fotos/skep/route.ts. */

const MAKS_BYTES = 15 * 1024 * 1024;
const MAKS_KANT = 1600;
const MAKS_VERWYSINGS = 4;

/** Die model se naaste grootte aan 16:9. Dit word later nie-destruktief na
 *  1280×720 gesny met lib/kaart/beeld.ts se fokus/zoem-wiskunde. */
const GROOTTE = "1536x1024";

export const VERSTEK_PROMPT =
  "A bold YouTube thumbnail BACKGROUND PLATE inspired by the reference images. " +
  "Dark, near-black, richly textured, with subtle film grain and a deep red tint. " +
  "Keep the LEFT THIRD darker and visually quiet — a person will be placed there. " +
  "Keep the right two thirds calm enough for a headline to sit on top. " +
  "Absolutely no people, no faces, no text, no lettering, no logos, no watermarks.";

function fout(boodskap: string, status: number) {
  return NextResponse.json({ fout: boodskap }, { status });
}

export async function POST(request: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return fout("verbode", 401);

  let vorm: FormData;
  try {
    vorm = await request.formData();
  } catch {
    return fout("ongeldige vorm", 400);
  }

  const prompt = String(vorm.get("prompt") ?? "").trim();
  if (!prompt) return fout("leë prompt", 400);

  const verwysings = vorm.getAll("verwysing").filter((v): v is File => v instanceof File && v.size > 0);
  if (verwysings.length === 0) return fout("stuur ten minste een verwysingsbeeld", 400);

  for (const v of verwysings) {
    if (v.size > MAKS_BYTES) return fout("Die lêer is groter as 15MB.", 413);
    if (v.type === "image/webp" || v.name.toLowerCase().endsWith(".webp")) {
      return fout("WebP werk nie — stuur PNG of JPEG.", 415);
    }
  }

  if (!process.env.OPENAI_API_KEY) return fout("OPENAI_API_KEY ontbreek", 503);

  /* Normaliseer elke verwysing voordat dit die model sien: EXIF reggedraai en
     die langste kant tot 1600px. 'n 8MP-foto kos net invoer-tekens. */
  const uit = new FormData();
  uit.append("prompt", prompt);
  uit.append("size", GROOTTE);
  uit.append("quality", "medium");
  for (const [i, v] of verwysings.slice(0, MAKS_VERWYSINGS).entries()) {
    const rou = Buffer.from(await v.arrayBuffer());
    const klein = await sharp(rou)
      .rotate()
      .resize(MAKS_KANT, MAKS_KANT, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    uit.append("image[]", new Blob([new Uint8Array(klein)], { type: "image/png" }), `verwysing-${i}.png`);
  }

  async function genereer(model: string) {
    uit.set("model", model);
    return fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: uit,
    });
  }

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  let res = await genereer(model);
  if (!res.ok && res.status < 500 && model !== "gpt-image-1") {
    res = await genereer("gpt-image-1");
  }
  if (!res.ok) {
    return fout(`Beeldmodel ${res.status}: ${(await res.text()).slice(0, 200)}`, 502);
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return fout("geen beeld terug nie", 502);

  const beeld = Buffer.from(b64, "base64");
  /* Meet die natuurlike afmetings EEN keer, sodat die snit-wiskunde hulle nie
     by elke render hoef te herbereken nie. */
  const meta = await sharp(beeld).metadata();

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const pad = `${datum}/${Date.now()}.png`;
  const { error } = await supabaseService()
    .storage.from("duimnael")
    .upload(pad, new Blob([new Uint8Array(beeld)], { type: "image/png" }), { contentType: "image/png" });
  if (error) return fout(error.message, 500);

  return NextResponse.json({
    ok: true,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/duimnael/${pad}`,
    wydte: meta.width ?? 1536,
    hoogte: meta.height ?? 1024,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/duimnael/agtergrond/route.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/duimnael/agtergrond
git commit -m "feat(duimnael): agtergrond-roete met gpt-image-2 en verwysingsbeelde"
```

---

### Task 7: The reaction library — list, upload, delete

**Files:**
- Create: `app/actions-duimnael.ts`
- Create: `app/api/duimnael/reaksie/route.ts`
- Test: `app/api/duimnael/reaksie/route.test.ts`

**Interfaces:**
- Produces: `lysReaksies(): Promise<{ naam: string; url: string }[]>` from `app/actions-duimnael.ts`.
- Produces: `POST /api/duimnael/reaksie` (multipart, field `leer`) → `{ ok: true, url, wydte, hoogte }`; `DELETE /api/duimnael/reaksie?naam=<naam>` → `{ ok: true }`.

- [ ] **Step 1: Write the failing test**

Create `app/api/duimnael/reaksie/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({ auth: { getUser } }),
}));

const upload = vi.fn();
const remove = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: () => ({ storage: { from: () => ({ upload, remove }) } }),
}));

/* Die egte helper is URL-IN, URL-UIT — nie grepe nie. Die mock moet dieselfde
   vorm hê, anders toets ons 'n roete wat in produksie nie kan werk nie. */
const verwyderAgtergrondReplicate = vi.fn<(url: string) => Promise<string>>();
const replicateConfigured = vi.fn(() => true);
vi.mock("@/lib/replicate", () => ({ verwyderAgtergrondReplicate, replicateConfigured }));

import { DELETE, POST } from "./route";

// 1x1 deursigtige PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function oplaai(naam = "blij.png", tipe = "image/png"): Request {
  const vorm = new FormData();
  vorm.append("leer", new File([new Uint8Array(PNG)], naam, { type: tipe }));
  return new Request("http://t/api/duimnael/reaksie", { method: "POST", body: vorm });
}

afterEach(() => {
  vi.restoreAllMocks();
  getUser.mockReset();
  upload.mockReset();
  remove.mockReset();
  verwyderAgtergrondReplicate.mockReset();
  replicateConfigured.mockReturnValue(true);
});

describe("POST /api/duimnael/reaksie", () => {
  it("weier sonder sessie", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(oplaai())).status).toBe(401);
  });

  it("weier WebP", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    expect((await POST(oplaai("x.webp", "image/webp"))).status).toBe(415);
  });

  it("gee 503 wanneer Replicate nie opgestel is nie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    replicateConfigured.mockReturnValue(false);
    const res = await POST(oplaai());
    expect(res.status).toBe(503);
    expect((await res.json()).fout).toContain("REPLICATE_API_TOKEN");
  });

  it("laai die rou beeld op, gee Replicate 'n URL, en herhuisves die uitset", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    verwyderAgtergrondReplicate.mockResolvedValue("https://replicate.delivery/tydelik.png");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array(PNG), { status: 200 }))
    );

    const res = await POST(oplaai());
    expect(res.status).toBe(200);

    // Replicate kry 'n URL, nooit grepe nie.
    const arg = verwyderAgtergrondReplicate.mock.calls[0][0];
    expect(typeof arg).toBe("string");
    expect(arg).toContain("https://sb.test/storage/v1/object/public/duimnael-reaksies/rou/");

    // Die tydelike uitset word dadelik gehaal, want dit verval binne 'n uur.
    expect(fetch).toHaveBeenCalledWith("https://replicate.delivery/tydelik.png", expect.anything());

    // Twee oplaaie (rou + uitgesny) en die rou een word weer opgeruim.
    expect(upload).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith([expect.stringContaining("rou/")]);

    expect((await res.json()).url).toContain("/duimnael-reaksies/");
  });

  it("ruim die rou oplaai op wanneer Replicate faal", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    verwyderAgtergrondReplicate.mockRejectedValue(new Error("Replicate 500"));
    const res = await POST(oplaai());
    expect(res.status).toBe(502);
    expect(remove).toHaveBeenCalledWith([expect.stringContaining("rou/")]);
  });
});

describe("DELETE /api/duimnael/reaksie", () => {
  it("weier sonder sessie", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(new Request("http://t/api/duimnael/reaksie?naam=a.png", { method: "DELETE" }));
    expect(res.status).toBe(401);
  });

  it("weier 'n naam met 'n padskeier — geen ontsnapping uit die emmer nie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    const res = await DELETE(
      new Request("http://t/api/duimnael/reaksie?naam=../ander/x.png", { method: "DELETE" })
    );
    expect(res.status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });

  it("verwyder die reaksie uit die emmer", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    remove.mockResolvedValue({ error: null });
    const res = await DELETE(new Request("http://t/api/duimnael/reaksie?naam=blij.png", { method: "DELETE" }));
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith(["blij.png"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/duimnael/reaksie/route.test.ts`
Expected: FAIL — `Failed to resolve import "./route"`.

- [ ] **Step 3: Understand the Replicate helper — it is URL-in, URL-out**

The real signature is:

```ts
export async function verwyderAgtergrondReplicate(beeldUrl: string): Promise<string>
```

It takes a **public URL** and returns a **temporary URL**. `replicate.delivery`
keeps outputs for roughly an hour, so the bytes must be re-housed immediately —
otherwise a saved thumbnail's cutout vanishes tomorrow. This is the same flow
`app/api/beeld/agtergrond/route.ts` already implements; copy it.

The upload therefore has five moves:

1. normalise the raw upload with `sharp` and put it in the bucket → public URL
2. `verwyderAgtergrondReplicate(publicUrl)` → temporary URL
3. `fetch` that temporary URL and take the bytes
4. normalise to PNG ≤1600px (keeping alpha) and upload as the real cutout
5. delete the temporary raw upload

Also note, from that route's own comment: **a raw `Buffer` gets mangled as text
by Supabase storage — always wrap it in a `Blob`.**

- [ ] **Step 4: Write minimal implementation**

Create `app/api/duimnael/reaksie/route.ts`:

```ts
import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { replicateConfigured, verwyderAgtergrondReplicate } from "@/lib/replicate";

export const maxDuration = 120;

/* Die reaksie-biblioteek. 'n Nuwe skoot kom as 'n gewone foto in; ons sny die
   agtergrond uit en stoor 'n DEURSIGTIGE PNG, want die uitknipsel word later
   bo-op 'n KI-agtergrond gecomposiet.

   Replicate neem 'n URL, nie grepe nie, en sy uitset-URL is TYDELIK
   (replicate.delivery hou dit ongeveer 'n uur). Ons laai die rou beeld dus
   eers op om 'n URL te kry, sny, herhuisves die uitset dadelik, en vee die
   tydelike rou beeld weer uit. */

const MAKS_BYTES = 15 * 1024 * 1024;
const MAKS_KANT = 1600;
const EMMER = "duimnael-reaksies";

function fout(boodskap: string, status: number) {
  return NextResponse.json({ fout: boodskap }, { status });
}

async function sessie() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  if (!(await sessie())) return fout("verbode", 401);

  let vorm: FormData;
  try {
    vorm = await request.formData();
  } catch {
    return fout("ongeldige vorm", 400);
  }

  const leer = vorm.get("leer");
  if (!(leer instanceof File) || leer.size === 0) return fout("geen lêer nie", 400);
  if (leer.size > MAKS_BYTES) return fout("Die lêer is groter as 15MB.", 413);
  if (leer.type === "image/webp" || leer.name.toLowerCase().endsWith(".webp")) {
    return fout("WebP werk nie — stuur PNG of JPEG.", 415);
  }
  if (!replicateConfigured()) return fout("REPLICATE_API_TOKEN ontbreek", 503);

  const svc = supabaseService();
  const basis = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EMMER}`;
  const rouPad = `rou/${Date.now()}.png`;

  try {
    // 1 — normaliseer en laai op sodat Replicate 'n URL het om te haal.
    const rou = Buffer.from(await leer.arrayBuffer());
    const genormaliseer = await sharp(rou)
      .rotate()
      .resize(MAKS_KANT, MAKS_KANT, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    // Rou Buffer word deur storage as teks gemangel — altyd as Blob.
    const opgelaai = await svc.storage
      .from(EMMER)
      .upload(rouPad, new Blob([new Uint8Array(genormaliseer)], { type: "image/png" }), {
        contentType: "image/png",
      });
    if (opgelaai.error) return fout(opgelaai.error.message, 500);

    // 2 — sny die agtergrond uit.
    const uitsetUrl = await verwyderAgtergrondReplicate(`${basis}/${rouPad}`);

    // 3 — Replicate se URL verval; haal die grepe dadelik.
    const haal = await fetch(uitsetUrl, { signal: AbortSignal.timeout(60_000) });
    if (!haal.ok) throw new Error(`Kon nie die uitset aflaai nie (${haal.status})`);
    const uitgesnyRou = Buffer.from(await haal.arrayBuffer());

    // 4 — herhuisves as 'n deursigtige PNG.
    const beeld = await sharp(uitgesnyRou)
      .resize({ width: MAKS_KANT, height: MAKS_KANT, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const meta = await sharp(beeld).metadata();

    const naam = `${Date.now()}.png`;
    const { error } = await svc.storage
      .from(EMMER)
      .upload(naam, new Blob([new Uint8Array(beeld)], { type: "image/png" }), {
        contentType: "image/png",
      });
    if (error) return fout(error.message, 500);

    // 5 — die rou beeld was net 'n hysbak vir Replicate.
    await svc.storage.from(EMMER).remove([rouPad]);

    return NextResponse.json({
      ok: true,
      naam,
      url: `${basis}/${naam}`,
      wydte: meta.width ?? 0,
      hoogte: meta.height ?? 0,
    });
  } catch (e) {
    await svc.storage.from(EMMER).remove([rouPad]);
    return fout(e instanceof Error ? e.message : "Kon nie die agtergrond verwyder nie", 502);
  }
}

export async function DELETE(request: Request) {
  if (!(await sessie())) return fout("verbode", 401);

  const naam = new URL(request.url).searchParams.get("naam") ?? "";
  /* Geen padskeiers nie: 'n naam soos "../ander/x.png" sou uit die emmer
     ontsnap en 'n ander bucket se lêer kon tref. */
  if (!naam || naam.includes("/") || naam.includes("\\") || naam.includes("..")) {
    return fout("ongeldige naam", 400);
  }

  const { error } = await supabaseService().storage.from(EMMER).remove([naam]);
  if (error) return fout(error.message, 500);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Write the server action that lists the library**

Create `app/actions-duimnael.ts`:

```ts
"use server";

import { supabaseServer } from "@/lib/supabase/server";

const EMMER = "duimnael-reaksies";

export type Reaksie = { naam: string; url: string };

/** Die reaksie-biblioteek is 'n emmer-lys, nie 'n vasgedraade register nie —
 *  AP laai skote op en vee hulle uit sonder 'n ontplooiing. */
export async function lysReaksies(): Promise<Reaksie[]> {
  const sb = await supabaseServer();
  const { data } = await sb.storage.from(EMMER).list("", { limit: 200, sortBy: { column: "name", order: "asc" } });
  const basis = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EMMER}`;
  return (data ?? [])
    .filter((f) => f.name.toLowerCase().endsWith(".png"))
    .map((f) => ({ naam: f.name, url: `${basis}/${f.name}` }));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/api/duimnael/reaksie/route.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 7: Commit**

```bash
git add app/api/duimnael/reaksie app/actions-duimnael.ts
git commit -m "feat(duimnael): reaksie-biblioteek — lys, laai op, verwyder"
```

---

### Task 8: Seed the twelve reaction shots

**Files:**
- Create: `scripts/saai-reaksies.ts`

The twelve shots already exist at `~/Downloads/ap-thumbnails/reaksies/*.png` (generated 2026-08-26 with `gpt-image-2` from the repaired master `~/Downloads/ap-master-clean.png`). They still have the charcoal studio background and must be cut out before seeding.

- [ ] **Step 1: Write the seed script**

Create `scripts/saai-reaksies.ts`:

```ts
/* Eenmalige saad van die reaksie-biblioteek.

   Loop:  npx tsx scripts/saai-reaksies.ts <gids>

   Replicate neem 'n URL, nie grepe nie, so elke skoot word EERS opgelaai om 'n
   URL te kry, dan gesny, dan word die uitset herhuisves — Replicate se
   uitset-URL verval binne 'n uur.

   IDEMPOTENT: 'n skoot wat reeds daar is, word oorgeslaan. Hardloop dit weer
   as een misluk het. */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { verwyderAgtergrondReplicate } from "../lib/replicate";

const EMMER = "duimnael-reaksies";
const MAKS_KANT = 1600;

async function main() {
  const gids = process.argv[2];
  if (!gids) {
    console.error("Gebruik: npx tsx scripts/saai-reaksies.ts <gids-met-png's>");
    process.exit(1);
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const basis = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EMMER}`;

  const { data: bestaande } = await sb.storage.from(EMMER).list("", { limit: 200 });
  const reeds = new Set((bestaande ?? []).map((f) => f.name));

  const lêers = (await readdir(gids)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  console.log(`${lêers.length} skote gevind, ${reeds.size} reeds in die emmer.`);

  for (const lêer of lêers) {
    const naam = lêer.replace(/^ap_/, "").toLowerCase();
    if (reeds.has(naam)) {
      console.log(`oorslaan  ${naam} (reeds daar)`);
      continue;
    }
    const rouPad = `rou/${naam}`;
    try {
      // 1 — laai die rou skoot op sodat Replicate 'n URL het.
      const rou = await readFile(path.join(gids, lêer));
      const klein = await sharp(rou)
        .resize(MAKS_KANT, MAKS_KANT, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      const op = await sb.storage
        .from(EMMER)
        .upload(rouPad, new Blob([new Uint8Array(klein)], { type: "image/png" }), {
          contentType: "image/png",
          upsert: true,
        });
      if (op.error) throw new Error(op.error.message);

      // 2 — sny uit, en haal die tydelike uitset dadelik af.
      const uitsetUrl = await verwyderAgtergrondReplicate(`${basis}/${rouPad}`);
      const haal = await fetch(uitsetUrl, { signal: AbortSignal.timeout(60_000) });
      if (!haal.ok) throw new Error(`Kon nie die uitset aflaai nie (${haal.status})`);

      // 3 — herhuisves as die regte deursigtige PNG.
      const beeld = await sharp(Buffer.from(await haal.arrayBuffer()))
        .resize({ width: MAKS_KANT, height: MAKS_KANT, fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
      const { error } = await sb.storage
        .from(EMMER)
        .upload(naam, new Blob([new Uint8Array(beeld)], { type: "image/png" }), {
          contentType: "image/png",
        });
      if (error) throw new Error(error.message);

      console.log(`opgelaai  ${naam}`);
    } catch (e) {
      console.error(`MISLUK    ${naam}: ${(e as Error).message}`);
    } finally {
      // Die rou skoot was net 'n hysbak vir Replicate.
      await sb.storage.from(EMMER).remove([rouPad]);
    }
  }
}

main();
```

- [ ] **Step 2: Run it**

```bash
npx tsx scripts/saai-reaksies.ts ~/Downloads/ap-thumbnails/reaksies
```

Expected: 12 `opgelaai` lines. If any line says `MISLUK`, run the command again — it skips what already uploaded.

- [ ] **Step 3: Verify the cutouts by eye, not by exit code**

Open two or three of the uploaded PNGs from the Supabase dashboard. Check the hair edge and the microphone grille — background removal frequently eats fine hair detail or leaves a halo. A clean exit code is not evidence the cutout is good.

If a cutout is bad, delete it from the bucket and re-upload that one shot through the UI in Task 9.

- [ ] **Step 4: Commit**

```bash
git add scripts/saai-reaksies.ts
git commit -m "feat(duimnael): saai-skrip vir die reaksie-biblioteek"
```

---

### Task 9: The editor — the studio page, drag overlay and export

**Files:**
- Create: `components/duimnael/studio.tsx`
- Create: `app/w/[slug]/duimnael/page.tsx`
- Create: `app/api/duimnael/render/route.ts`
- Modify: `app/w/[slug]/studio/page.tsx:12-50` (add the card to `GEREEDSKAP`)

**Interfaces:**
- Consumes: `normaliseerDuimnael`, `RAAM`, `GLOED_VERSTEK`, types from `@/lib/duimnael/spec`; `laagKas` from `@/lib/duimnael/laag`; `gloedKas`, `gloedSvgUrl` from `@/lib/duimnael/gloed`; `lysReaksies` from `@/app/actions-duimnael`; `VERSTEK_PROMPT` from the backdrop route.
- **Must NOT import** `@/lib/duimnael/render` — ESLint blocks it (Task 4).

- [ ] **Step 1: Write the render route**

Create `app/api/duimnael/render/route.ts`:

```ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { renderDuimnael } from "@/lib/duimnael/render";
import { normaliseerDuimnael } from "@/lib/duimnael/spec";

export const maxDuration = 30;

/* Die kliënt stuur 'n spec; ons stuur 'n PNG terug. Die spec word ALTYD
   genormaliseer voordat dit die renderaar sien — die blaaier is nie 'n
   vertroude bron nie. */
export async function POST(request: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const rou = await request.json().catch(() => null);
  const duimnael = normaliseerDuimnael(rou?.duimnael);
  const skaal = typeof rou?.skaal === "number" ? rou.skaal : 1;

  const png = await renderDuimnael(duimnael, skaal);
  return new NextResponse(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "no-store" },
  });
}
```

- [ ] **Step 2: Write the editor**

Create `components/duimnael/studio.tsx`. The load-bearing rule: the overlay positions every layer with **`laagKas`** — the same function `render.tsx` uses — scaled by the preview's CSS width. That is what makes the preview truthful.

```tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { gloedKas, gloedSvgUrl } from "@/lib/duimnael/gloed";
import { laagKas } from "@/lib/duimnael/laag";
import { GLOED_VERSTEK, RAAM, type Duimnael, type Laag } from "@/lib/duimnael/spec";
import type { Reaksie } from "@/app/actions-duimnael";

/* Die redigeerder.

   Die oorlegger roep laagKas — DIESELFDE funksie as die renderaar — en skaal
   net die uitset met die voorskou se breedte. Daar is dus geen tweede
   uitleg-implementering wat kan wegdryf nie: wat AP hier sleep is presies wat
   satori teken. */

const VOORSKOU_BREEDTE = 960;

export function DuimnaelStudio({
  reaksies,
  verstekPrompt,
}: {
  reaksies: Reaksie[];
  verstekPrompt: string;
}) {
  const [duimnael, setDuimnael] = useState<Duimnael>({ agtergrond: null, lae: [] });
  const [prompt, setPrompt] = useState(verstekPrompt);
  const [verwysings, setVerwysings] = useState<File[]>([]);
  const [besig, setBesig] = useState<string | null>(null);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [gekies, setGekies] = useState<number | null>(null);
  const raamRef = useRef<HTMLDivElement>(null);

  const skaal = VOORSKOU_BREEDTE / RAAM.w;

  const stelLaag = useCallback((i: number, verander: (l: Laag) => Laag) => {
    setDuimnael((d) => ({ ...d, lae: d.lae.map((l, j) => (j === i ? verander(l) : l)) }));
  }, []);

  // ---- sleep ----
  const sleep = useCallback(
    (i: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      setGekies(i);
      const raam = raamRef.current;
      if (!raam) return;
      const kas = raam.getBoundingClientRect();
      const beweeg = (ev: PointerEvent) => {
        const x = Math.min(1, Math.max(0, (ev.clientX - kas.left) / kas.width));
        const y = Math.min(1, Math.max(0, (ev.clientY - kas.top) / kas.height));
        stelLaag(i, (l) => ({ ...l, plek: { ...l.plek, x, y } }));
      };
      const los = () => {
        window.removeEventListener("pointermove", beweeg);
        window.removeEventListener("pointerup", los);
      };
      window.addEventListener("pointermove", beweeg);
      window.addEventListener("pointerup", los);
    },
    [stelLaag]
  );

  // ---- agtergrond genereer ----
  async function genereerAgtergrond() {
    if (verwysings.length === 0) {
      setBoodskap("Laai eers 'n verwysingsbeeld op.");
      return;
    }
    setBesig("Agtergrond word gemaak — dit vat 30-60s…");
    setBoodskap(null);
    const vorm = new FormData();
    vorm.append("prompt", prompt);
    for (const v of verwysings) vorm.append("verwysing", v);
    const res = await fetch("/api/duimnael/agtergrond", { method: "POST", body: vorm });
    const data = await res.json();
    setBesig(null);
    if (!res.ok) {
      setBoodskap(data.fout ?? "Die agtergrond kon nie gemaak word nie.");
      return;
    }
    setDuimnael((d) => ({
      ...d,
      agtergrond: {
        url: data.url,
        wydte: data.wydte,
        hoogte: data.hoogte,
        fokusX: 0.5,
        fokusY: 0.5,
        zoem: 1,
        deursigtig: false,
      },
    }));
  }

  // ---- lae byvoeg ----
  function kiesReaksie(r: Reaksie) {
    const beeld = new Image();
    beeld.onload = () => {
      setDuimnael((d) => ({
        ...d,
        lae: [
          ...d.lae.filter((l) => l.soort !== "reaksie"),
          {
            soort: "reaksie",
            url: r.url,
            wydte: beeld.naturalWidth,
            hoogte: beeld.naturalHeight,
            plek: { x: 0.25, y: 0.55, grootte: 0.55 },
            gloed: GLOED_VERSTEK,
          },
        ],
      }));
    };
    beeld.src = r.url;
  }

  function voegTeksBy() {
    setDuimnael((d) => ({
      ...d,
      lae: [
        ...d.lae,
        { soort: "teks", teks: "NUWE TEKS", kleur: "wit", belyn: "links", plek: { x: 0.5, y: 0.12, grootte: 0.09 } },
      ],
    }));
  }

  function voegLogoBy(kleur: "ink" | "wit") {
    setDuimnael((d) => ({
      ...d,
      lae: [...d.lae.filter((l) => l.soort !== "logo"), { soort: "logo", kleur, plek: { x: 0.9, y: 0.85, grootte: 0.12 } }],
    }));
  }

  function verwyderLaag(i: number) {
    setDuimnael((d) => ({ ...d, lae: d.lae.filter((_, j) => j !== i) }));
    setGekies(null);
  }

  // ---- aflaai ----
  async function laaiAf() {
    setBesig("Duimnael word gerender…");
    const res = await fetch("/api/duimnael/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ duimnael, skaal: 1 }),
    });
    setBesig(null);
    if (!res.ok) {
      setBoodskap("Die render het misluk.");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "duimnael.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const agtergrondStyl = useMemo(() => {
    if (!duimnael.agtergrond) return undefined;
    return {
      backgroundImage: `url(${duimnael.agtergrond.url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    } as const;
  }, [duimnael.agtergrond]);

  const gekose = gekies !== null ? duimnael.lae[gekies] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_20rem]">
      <div>
        {/* Die voorskou. Alles hierbinne word deur laagKas geposisioneer. */}
        <div
          ref={raamRef}
          className="relative overflow-hidden border-2 border-ink bg-[#0B0B0B]"
          style={{ width: VOORSKOU_BREEDTE, height: VOORSKOU_BREEDTE * (RAAM.h / RAAM.w), ...agtergrondStyl }}
        >
          {duimnael.lae.map((laag, i) => {
            const k = laagKas(laag, RAAM);
            const g = gloedKas(laag, RAAM);
            return (
              <div key={i}>
                {g && laag.soort === "reaksie" ? (
                  <img
                    alt=""
                    src={gloedSvgUrl(laag.gloed)}
                    style={{
                      position: "absolute",
                      left: g.left * skaal,
                      top: g.top * skaal,
                      width: g.width * skaal,
                      height: g.height! * skaal,
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
                <div
                  onPointerDown={sleep(i)}
                  style={{
                    position: "absolute",
                    left: k.left * skaal,
                    top: k.top * skaal,
                    width: k.width * skaal,
                    height: k.height ? k.height * skaal : undefined,
                    cursor: "grab",
                    outline: gekies === i ? "2px solid #E2231A" : "none",
                  }}
                >
                  {laag.soort === "teks" ? (
                    <div
                      style={{
                        fontFamily: "var(--font-league-spartan, sans-serif)",
                        fontWeight: 700,
                        fontSize: k.fontSize! * skaal,
                        lineHeight: 1.02,
                        letterSpacing: "-0.02em",
                        color: laag.kleur === "wit" ? "#FFFFFF" : "#111111",
                        textAlign: laag.belyn === "middel" ? "center" : laag.belyn === "regs" ? "right" : "left",
                        textShadow: laag.kleur === "wit" ? "0 4px 18px rgba(0,0,0,0.55)" : "none",
                        userSelect: "none",
                      }}
                    >
                      {laag.teks}
                    </div>
                  ) : (
                    <img
                      alt=""
                      src={laag.soort === "logo" ? `/logo-${laag.kleur}.png` : laag.url}
                      style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {besig ? <p className="mt-3 text-sm text-ink/60">{besig}</p> : null}
        {boodskap ? <p className="mt-3 text-sm text-red">{boodskap}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={voegTeksBy} className="border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper">
            + Teks
          </button>
          <button onClick={() => voegLogoBy("wit")} className="border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper">
            + Logo (wit)
          </button>
          <button onClick={() => voegLogoBy("ink")} className="border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper">
            + Logo (swart)
          </button>
          <button onClick={laaiAf} className="border-2 border-ink bg-ink px-3 py-1.5 text-sm font-bold text-paper">
            Laai af (1280×720)
          </button>
        </div>
      </div>

      <aside className="space-y-6">
        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide">1 · Reaksie</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {reaksies.map((r) => (
              <button key={r.naam} onClick={() => kiesReaksie(r)} className="border-2 border-ink hover:bg-paper">
                <img alt={r.naam} src={r.url} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
          {reaksies.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">Nog geen reaksies nie — loop die saai-skrip.</p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide">2 · Agtergrond</h2>
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={(e) => setVerwysings(Array.from(e.target.files ?? []).slice(0, 4))}
            className="mt-2 block w-full text-sm"
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="mt-2 w-full border-2 border-ink bg-offwhite p-2 text-xs"
          />
          <button
            onClick={genereerAgtergrond}
            disabled={besig !== null}
            className="mt-2 w-full border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper disabled:opacity-40"
          >
            Maak agtergrond
          </button>
        </section>

        {gekose ? (
          <section>
            <h2 className="text-sm font-extrabold uppercase tracking-wide">3 · Gekose laag</h2>
            {gekose.soort === "teks" ? (
              <>
                <textarea
                  value={gekose.teks}
                  onChange={(e) => stelLaag(gekies!, (l) => ({ ...l, teks: e.target.value }) as Laag)}
                  rows={2}
                  className="mt-2 w-full border-2 border-ink bg-offwhite p-2 text-sm"
                />
                <select
                  value={gekose.belyn}
                  onChange={(e) => stelLaag(gekies!, (l) => ({ ...l, belyn: e.target.value }) as Laag)}
                  className="mt-2 w-full border-2 border-ink bg-offwhite p-1.5 text-sm"
                >
                  <option value="links">Links belyn</option>
                  <option value="middel">Gesentreer</option>
                  <option value="regs">Regs belyn</option>
                </select>
              </>
            ) : null}
            <label className="mt-3 block text-xs font-bold uppercase">Grootte</label>
            <input
              type="range"
              min={0.02}
              max={1}
              step={0.005}
              value={gekose.plek.grootte}
              onChange={(e) =>
                stelLaag(gekies!, (l) => ({ ...l, plek: { ...l.plek, grootte: Number(e.target.value) } }))
              }
              className="w-full"
            />
            {gekose.soort === "reaksie" ? (
              <>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={gekose.gloed.aan}
                    onChange={(e) =>
                      stelLaag(gekies!, (l) =>
                        l.soort === "reaksie" ? { ...l, gloed: { ...l.gloed, aan: e.target.checked } } : l
                      )
                    }
                  />
                  Rooi gloed
                </label>
                <label className="mt-2 block text-xs font-bold uppercase">Gloed-radius</label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={gekose.gloed.radius}
                  onChange={(e) =>
                    stelLaag(gekies!, (l) =>
                      l.soort === "reaksie" ? { ...l, gloed: { ...l.gloed, radius: Number(e.target.value) } } : l
                    )
                  }
                  className="w-full"
                />
              </>
            ) : null}
            <button
              onClick={() => verwyderLaag(gekies!)}
              className="mt-3 w-full border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper"
            >
              Verwyder laag
            </button>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Write the page**

Create `app/w/[slug]/duimnael/page.tsx`, copying the shell/workspace pattern from `app/w/[slug]/studio/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { DuimnaelStudio } from "@/components/duimnael/studio";
import { lysReaksies } from "@/app/actions-duimnael";
import { VERSTEK_PROMPT } from "@/app/api/duimnael/agtergrond/route";

export const dynamic = "force-dynamic";

export default async function Duimnael({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb.from("workspaces").select("id, slug, naam, accent").order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const reaksies = await lysReaksies();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight">
        Duimnaels
        <span aria-hidden className="size-2.5 rounded-full bg-red" />
      </h1>
      <p className="mt-2 max-w-lg text-sm text-ink/60">
        Kies 'n reaksie, laai vandag se onderwerpe op vir 'n agtergrond, en sleep die teks waar jy dit wil hê.
      </p>
      <div className="mt-6">
        <DuimnaelStudio reaksies={reaksies} verstekPrompt={VERSTEK_PROMPT} />
      </div>
    </Shell>
  );
}
```

- [ ] **Step 4: Add the studio card**

In `app/w/[slug]/studio/page.tsx`, append to the `GEREEDSKAP` array (after the `grafiek` entry):

```ts
  {
    pad: "duimnael",
    naam: "Duimnaels",
    wat: "Bou 'n YouTube-duimnael: kies AP se reaksie, laat die KI 'n agtergrond uit vandag se onderwerpe maak, en sleep die opskrif waar jy dit wil hê.",
  },
```

- [ ] **Step 5: Verify lint and types**

Run: `npm run lint`
Expected: clean. In particular, no `no-restricted-imports` error — `components/duimnael/studio.tsx` must import only `spec`, `laag` and `gloed`.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Verify in a real browser — a clean build is NOT verification**

Run: `npm run dev`, open `http://localhost:3000/w/buitelyn/duimnael`, and check each of these by eye:

1. The reaction grid shows the 12 seeded cutouts.
2. Clicking one puts AP on the left with the red glow behind him.
3. Dragging AP moves **the glow with him** — this is the whole point of the glow being an attribute rather than a layer.
4. "+ Teks" adds a block; dragging it and changing the size slider both work.
5. Upload a reference image, click "Maak agtergrond", wait 30–60s, and a backdrop appears behind AP.
6. "Laai af" downloads a PNG. **Open it.** Every layer must be in exactly the position the preview showed. If the download differs from the preview, the shared-geometry contract is broken — that is a bug in `laagKas` usage, not a styling nit.
7. Switch the logo between white and black; both must render in the download.

- [ ] **Step 7: Commit**

```bash
git add components/duimnael app/w/\[slug\]/duimnael app/api/duimnael/render app/w/\[slug\]/studio/page.tsx
git commit -m "feat(duimnael): die redigeerder met sleepbare lae en aflaai"
```

---

### Task 10: Full suite and a real end-to-end thumbnail

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS, including the pre-existing `lib/kaart/` baseline hashes. If a `lib/kaart` hash changed, **you broke something in shared code** — `beeld.ts` is imported by both modules. Investigate; do not regenerate the golden values.

- [ ] **Step 2: Run lint and types**

Run: `npm run lint && npx tsc --noEmit`
Expected: both clean.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Make one real thumbnail and look at it**

In the browser, build a complete thumbnail end to end — reaction, generated backdrop, two lines of text, logo — and download it. Confirm:

- Output is exactly 1280×720.
- Text renders in League Spartan, not a fallback. A fallback sans-serif means the font never reached satori.
- No stray text, lettering or watermark anywhere in the AI backdrop.
- AP's cutout has no white artifact on the microphone.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(duimnael): regstellings ná die end-tot-end-toets"
```

---

## Self-Review

**Spec coverage** — every section of the design maps to a task:

| Spec section | Task |
|---|---|
| `lib/duimnael/spec.ts`, client-safe types, normalisation | 1 |
| `laag.ts` shared geometry, `grootte` semantics, `belyn` anchoring | 2 |
| Deterministic red glow, follows AP, no stars | 3 |
| `render.tsx` satori composite, client/server boundary | 4 |
| Buckets `duimnael` + `duimnael-reaksies` | 5 |
| gpt-image-2 backdrop from refs, `gpt-image-1` fallback, freeform prompt, 1536×1024 cropped not squashed | 6 |
| Reaction library uploadable **and** removable | 7 |
| Seed the 12 shots, rephrase fallback noted | 8 |
| Draggable text **and** logo, editor, export | 9 |
| Error handling table (401/400/413/415/502/503) | 6, 7 |
| Testing per `lib/kaart/render.test.ts` pattern | 1, 2, 3, 4, 6, 7 |

**Known gap, deliberately carried:** the design's error table lists a 503 for a missing `REPLICATE_API_TOKEN` (Task 7) and for `OPENAI_API_KEY` (Task 6); both are covered. The design's "no thumbnail history/versioning" is out of scope and no task implements it — correct.

**Type consistency check:** `laagKas` is used with the same signature in Tasks 2, 4 and 9. `LaagKas.height` is optional and every consumer either guards it (`k.height ? … : undefined`) or asserts it only where `gloedKas` guarantees it. `Gloed`/`GLOED_VERSTEK` are defined once in Task 1 and imported everywhere. `Reaksie` is defined in Task 7 and consumed in Task 9. `VERSTEK_PROMPT` is exported in Task 6 and consumed in Task 9.

**Corrected during self-review:** the plan originally guessed the Replicate helper as byte-in/byte-out. The real signature is `verwyderAgtergrondReplicate(beeldUrl: string): Promise<string>` — URL in, *temporary* URL out. Tasks 7 and 8 now implement the real five-step flow (upload → cut → fetch before it expires → re-house → clean up the temporary raw upload), and the test mock matches. Had the guess shipped, the route would have failed in production about an hour after each upload.
