# Vandag se Oorsigte — oudio-argief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A page in hq.buitelyn.com where Piet and AP can play back or download the three daily market oorsigte, grouped by day, last seven days.

**Architecture:** The archive already exists — the audio cron uploads `${datum}-${uitgawe}.mp3` into the public `markte-oudio` Supabase bucket. We read the bucket directly (not the `markte_oorsigte` table, which keeps only one `oudio_url` per day and therefore remembers just the latest edition). A pure grouping function turns filenames into day-grouped tracks; a server component renders players and download links.

**Tech Stack:** Next.js 16.2 App Router (the `admin/` app), TypeScript, Tailwind v4, Supabase Storage, Vitest.

## Global Constraints

- Work in **`admin/`** — a separate Next.js app from `web/`, with its own `package.json` and `node_modules`. Do not touch `web/` in this plan.
- Branch is **`oorsig-argief`** (off `main`). Commit there; do not switch branches.
- The brand is **"Buitelyn"** — never "Die Buitelyn" — in every string and comment.
- All user-facing copy and code comments in **Afrikaans**.
- Visual style matches the sibling admin pages: flat surfaces, `border-2 border-ink`, **zero border radius, no shadows**, `bg-offwhite` / `bg-paper`, uppercase tracked labels at `text-xs font-semibold tracking-[0.16em] text-ink/50`.
- **Nothing is ever deleted** — no cleanup, no cron, no destructive call. The page is read-only over storage.
- Tests run from `admin/` with `npm test` (vitest). Typecheck with `npx tsc --noEmit`.
- The repo's `AGENTS.md` warns this Next.js version differs from training data — read `node_modules/next/dist/docs/` before using an unfamiliar API.

---

### Task 1: The grouping function

**Files:**
- Create: `admin/lib/oorsig-argief.ts`
- Test: `admin/lib/oorsig-argief.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  ```ts
  export type Uitgawe = "oggend" | "middag" | "aand";
  export type Snit = { uitgawe: Uitgawe; url: string; grootte: number };
  export type Dag = { datum: string; datumWoorde: string; snitte: Snit[] };
  export const UITGAWES: Uitgawe[];              // ["oggend", "middag", "aand"]
  export function skryfDatumUit(datum: string): string;
  export function groepeerLeers(
    leers: { name: string; grootte: number }[],
    publiekeBasis: string,
    maksDae?: number
  ): Dag[];
  ```
  Task 2 imports `groepeerLeers`, `UITGAWES`, `Dag`, `Snit` and `Uitgawe`.

- [ ] **Step 1: Write the failing test**

```ts
// admin/lib/oorsig-argief.test.ts
import { describe, expect, it } from "vitest";
import { groepeerLeers } from "./oorsig-argief";

const BASIS = "https://mstrumkcyfikbddfmjti.supabase.co";
const leer = (name: string, grootte = 800_000) => ({ name, grootte });

describe("groepeerLeers", () => {
  it("groepeer 'n dag se drie uitgawes in een Dag", () => {
    const dae = groepeerLeers(
      [leer("2026-08-05-oggend.mp3"), leer("2026-08-05-middag.mp3"), leer("2026-08-05-aand.mp3")],
      BASIS
    );
    expect(dae).toHaveLength(1);
    expect(dae[0].datum).toBe("2026-08-05");
    expect(dae[0].snitte).toHaveLength(3);
  });

  it("sorteer uitgawes oggend → middag → aand, NIE alfabeties nie", () => {
    // alfabeties sou "aand" eerste plaas — dit is die bug wat dié toets vang
    const dae = groepeerLeers(
      [leer("2026-08-05-aand.mp3"), leer("2026-08-05-oggend.mp3"), leer("2026-08-05-middag.mp3")],
      BASIS
    );
    expect(dae[0].snitte.map((s) => s.uitgawe)).toEqual(["oggend", "middag", "aand"]);
  });

  it("sorteer dae nuutste eerste", () => {
    const dae = groepeerLeers(
      [leer("2026-08-03-oggend.mp3"), leer("2026-08-06-oggend.mp3"), leer("2026-08-05-oggend.mp3")],
      BASIS
    );
    expect(dae.map((d) => d.datum)).toEqual(["2026-08-06", "2026-08-05", "2026-08-03"]);
  });

  it("hou net die jongste sewe dae", () => {
    const leers = Array.from({ length: 10 }, (_, n) =>
      leer(`2026-08-${String(n + 1).padStart(2, "0")}-oggend.mp3`)
    );
    const dae = groepeerLeers(leers, BASIS);
    expect(dae).toHaveLength(7);
    expect(dae[0].datum).toBe("2026-08-10"); // nuutste
    expect(dae[6].datum).toBe("2026-08-04"); // sewende nuutste
  });

  it("maksDae is instelbaar", () => {
    const leers = Array.from({ length: 5 }, (_, n) =>
      leer(`2026-08-0${n + 1}-oggend.mp3`)
    );
    expect(groepeerLeers(leers, BASIS, 2)).toHaveLength(2);
  });

  it("ignoreer lêers wat nie die patroon pas nie", () => {
    const dae = groepeerLeers(
      [
        leer("2026-08-05-oggend.mp3"),
        leer("willekeurig.txt"),
        leer("2026-08-05.mp3"), // geen uitgawe
        leer("2026-08-05-oggend.wav"), // verkeerde formaat
        leer("2026-08-05-nag.mp3"), // onbekende uitgawe
        leer(".emptyFolderPlaceholder"), // Supabase se eie plekhouer
      ],
      BASIS
    );
    expect(dae).toHaveLength(1);
    expect(dae[0].snitte.map((s) => s.uitgawe)).toEqual(["oggend"]);
  });

  it("gee [] vir 'n leë lys sonder om te gooi", () => {
    expect(groepeerLeers([], BASIS)).toEqual([]);
  });

  it("bou die publieke bucket-URL en behou die grootte", () => {
    const dae = groepeerLeers([leer("2026-08-05-middag.mp3", 1_048_576)], BASIS);
    expect(dae[0].snitte[0].url).toBe(
      `${BASIS}/storage/v1/object/public/markte-oudio/2026-08-05-middag.mp3`
    );
    expect(dae[0].snitte[0].grootte).toBe(1_048_576);
  });

  it("skryf die datum in Afrikaans uit, met die weekdag", () => {
    // 2026-08-05 is 'n Woensdag
    const [dag] = groepeerLeers([leer("2026-08-05-oggend.mp3")], BASIS);
    expect(dag.datumWoorde).toMatch(/Woensdag/i);
    expect(dag.datumWoorde).toMatch(/Augustus/i);
    expect(dag.datumWoorde).toMatch(/2026/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd admin && npx vitest run lib/oorsig-argief.test.ts`
Expected: FAIL — `Failed to resolve import "./oorsig-argief"`

- [ ] **Step 3: Write the implementation**

```ts
// admin/lib/oorsig-argief.ts
/* Die oudio-cron laai elke uitgawe op as ${datum}-${uitgawe}.mp3 in die
   publieke markte-oudio bucket. markte_oorsigte hou net één oudio_url per dag
   (datum is unique), so die tabel onthou slegs die jongste uitgawe — die
   lêernaam is die enigste volledige indeks. Hierdie funksie is suiwer sodat
   die randgevalle sonder Supabase getoets kan word. */

export type Uitgawe = "oggend" | "middag" | "aand";
export type Snit = { uitgawe: Uitgawe; url: string; grootte: number };
export type Dag = { datum: string; datumWoorde: string; snitte: Snit[] };

export const UITGAWES: Uitgawe[] = ["oggend", "middag", "aand"];

const PATROON = /^(\d{4}-\d{2}-\d{2})-(oggend|middag|aand)\.mp3$/;

const datumFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "2026-08-05" → "Woensdag 5 Augustus 2026" (hoofletter aan die begin). */
export function skryfDatumUit(datum: string): string {
  // middag-UTC vermy enige dag-verskuiwing wanneer na SAST omgeskakel word
  const woorde = datumFmt.format(new Date(`${datum}T12:00:00Z`));
  return woorde.charAt(0).toUpperCase() + woorde.slice(1);
}

export function groepeerLeers(
  leers: { name: string; grootte: number }[],
  publiekeBasis: string,
  maksDae = 7
): Dag[] {
  const perDatum = new Map<string, Snit[]>();

  for (const { name, grootte } of leers) {
    const pas = PATROON.exec(name);
    if (!pas) continue; // vreemde lêers breek nie die blad nie
    const [, datum, uitgawe] = pas;
    const snit: Snit = {
      uitgawe: uitgawe as Uitgawe,
      url: `${publiekeBasis}/storage/v1/object/public/markte-oudio/${name}`,
      grootte,
    };
    const bestaande = perDatum.get(datum);
    if (bestaande) bestaande.push(snit);
    else perDatum.set(datum, [snit]);
  }

  return [...perDatum.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // ISO-datums: nuutste eerste
    .slice(0, maksDae)
    .map(([datum, snitte]) => ({
      datum,
      datumWoorde: skryfDatumUit(datum),
      // vaste uitgawe-volgorde — alfabeties sou "aand" eerste plaas
      snitte: snitte.sort(
        (a, b) => UITGAWES.indexOf(a.uitgawe) - UITGAWES.indexOf(b.uitgawe)
      ),
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd admin && npx vitest run lib/oorsig-argief.test.ts`
Expected: PASS (9 tests)

If the Afrikaans date test fails, print the actual output of `skryfDatumUit("2026-08-05")` and adjust the assertions to match what `Intl` genuinely produces for `af-ZA` on this runtime — but do **not** weaken it to a bare truthy check; it must still assert the weekday, the month name and the year.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `cd admin && npm test && npx tsc --noEmit`
Expected: all tests pass (13 pre-existing + 9 new), no type errors.

- [ ] **Step 6: Commit**

```bash
git add admin/lib/oorsig-argief.ts admin/lib/oorsig-argief.test.ts
git commit -m "feat(admin): groepeer oudio-lêers per dag vir die oorsig-argief"
```

---

### Task 2: The archive page and its Studio card

**Files:**
- Create: `admin/app/actions-oorsig-argief.ts`
- Create: `admin/app/w/[slug]/oorsigte-argief/page.tsx`
- Modify: `admin/app/w/[slug]/studio/page.tsx` (one entry in `GEREEDSKAP`, inserted **after the `oorsig` entry**, around line 16)

**Interfaces:**
- Consumes: `groepeerLeers`, `UITGAWES`, and types `Dag` / `Snit` / `Uitgawe` from `admin/lib/oorsig-argief.ts` (Task 1); `supabaseService()` from `admin/lib/supabase/service.ts`; `Shell` and `type Workspace` from `admin/components/shell.tsx`.
- Produces: route `/w/buitelyn/oorsigte-argief`.

- [ ] **Step 1: Write the data action**

```ts
// admin/app/actions-oorsig-argief.ts
"use server";
import { supabaseService } from "@/lib/supabase/service";
import { groepeerLeers, type Dag } from "@/lib/oorsig-argief";

/* Lees die bucket, nie markte_oorsigte nie: die tabel hou één oudio_url per dag
   en sou dus een speler per dag wys in plaas van drie. */
export async function kryOorsigArgief(): Promise<{ dae: Dag[]; fout: string | null }> {
  const basis = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!basis) return { dae: [], fout: "NEXT_PUBLIC_SUPABASE_URL is nie gestel nie." };

  const { data, error } = await supabaseService()
    .storage.from("markte-oudio")
    /* sortBy is nie kosmeties nie: teen 3 lêers per beursdag tref die
       1000-perk oor ±15 maande, en sonder 'n eksplisiete sortering kon die
       afgekapte bladsy eendag juis die nuutste dae uitlaat. ISO-datums
       sorteer leksikografies, dus gee name desc altyd nuutste eerste. */
    .list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });

  if (error) return { dae: [], fout: error.message };

  const leers = (data ?? []).map((f) => ({
    name: f.name,
    grootte: (f.metadata as { size?: number } | null)?.size ?? 0,
  }));
  return { dae: groepeerLeers(leers, basis), fout: null };
}
```

- [ ] **Step 2: Write the page**

```tsx
// admin/app/w/[slug]/oorsigte-argief/page.tsx
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { kryOorsigArgief } from "@/app/actions-oorsig-argief";
import { UITGAWES, type Uitgawe, type Snit } from "@/lib/oorsig-argief";

export const dynamic = "force-dynamic";

/* Wanneer elke uitgawe verskyn (SAST) — die cron loop 50 4,9,15 UTC, Ma–Vr. */
const TYE: Record<Uitgawe, string> = { oggend: "06:50", middag: "11:50", aand: "17:50" };

const mb = (grepe: number) => `${(grepe / 1024 / 1024).toFixed(1)} MB`;

export default async function OorsigArgief({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const { dae, fout } = await kryOorsigArgief();
  const vandag = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-3xl font-extrabold tracking-tight">Vandag se Oorsigte</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/60">
        Die oggend-, middag- en aanduitgawes van die laaste sewe beursdae — luister hier
        of laai af. Niks word uitgevee nie; ouer dae bly gestoor.
      </p>

      {fout ? (
        <p className="mt-6 max-w-xl border-2 border-red bg-offwhite p-4 text-sm">
          Kon nie die argief laai nie: {fout}
        </p>
      ) : null}

      {!fout && !dae.length ? (
        <p className="mt-6 text-sm text-ink/60">Nog geen oorsigte nie.</p>
      ) : null}

      <div className="mt-6 max-w-2xl space-y-4">
        {dae.map((dag) => {
          const perUitgawe = new Map<Uitgawe, Snit>(dag.snitte.map((s) => [s.uitgawe, s]));
          return (
            <section key={dag.datum} className="border-2 border-ink bg-offwhite p-5">
              <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50">
                {dag.datumWoorde.toUpperCase()}
              </h2>
              <ul className="mt-3 space-y-3">
                {UITGAWES.map((u) => {
                  const snit = perUitgawe.get(u);
                  /* Vandag se nog-onvoltooide uitgawes wys as hangend met hul tyd:
                     'n missende 11:50-lêer moet lees as "nog nie", nie as "stukkend". */
                  if (!snit) {
                    return dag.datum === vandag ? (
                      <li key={u} className="flex items-center gap-3 text-sm text-ink/40">
                        <span className="w-16 font-semibold tracking-[0.12em]">{u.toUpperCase()}</span>
                        <span>kom {TYE[u]}</span>
                      </li>
                    ) : null;
                  }
                  return (
                    <li key={u} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="w-16 text-sm font-semibold tracking-[0.12em]">{u.toUpperCase()}</span>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio controls preload="none" src={snit.url} className="h-9 min-w-64 flex-1" />
                      <a
                        href={snit.url}
                        download={`buitelyn-${dag.datum}-${u}.mp3`}
                        className="border-2 border-ink px-3 py-1 text-xs font-semibold hover:bg-paper"
                      >
                        Laai af ({mb(snit.grootte)})
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Register the Studio card**

In `admin/app/w/[slug]/studio/page.tsx`, insert this **immediately after the `oorsig` entry** (the one named `"Oorsigte"`, ending around line 16) — not at the end of the array. The `gidse` branch appends at the end; inserting here keeps the two changes in different hunks so they merge cleanly, and it is also the right reading order (write today's, then listen back).

```ts
  {
    pad: "oorsigte-argief",
    naam: "Vandag se Oorsigte",
    wat: "Luister terug of laai af — die oggend-, middag- en aanduitgawes van die laaste sewe dae.",
  },
```

- [ ] **Step 4: Typecheck and build**

Run: `cd admin && npx tsc --noEmit && npx next build`
Expected: no type errors; build succeeds and `/w/[slug]/oorsigte-argief` appears in the route list.

- [ ] **Step 5: Verify against the real bucket**

```bash
cd admin && node --env-file=.env.local -e '
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
sb.storage.from("markte-oudio").list("", { limit: 1000, sortBy: { column: "name", order: "desc" } })
  .then(({ data, error }) => {
    if (error) return console.log("FOUT:", error.message);
    console.log("lêers:", data.length, "| eerste:", data[0]?.name);
    console.log("unieke dae:", new Set(data.map(f => f.name.slice(0,10))).size);
  });'
```
Expected: a non-zero file count, the newest filename first (confirming the sort), and roughly 8+ unique days. This proves the query shape the page depends on actually works against production storage.

- [ ] **Step 6: Run the full suite**

Run: `cd admin && npm test`
Expected: all tests still pass (22 total).

- [ ] **Step 7: Commit**

```bash
git add admin/app/actions-oorsig-argief.ts admin/app/w/\[slug\]/oorsigte-argief admin/app/w/\[slug\]/studio/page.tsx
git commit -m "feat(admin): Vandag se Oorsigte — oudio-argief met spelers en aflaaiskakels"
```

---

## Deployment note

Nothing to configure. The `admin` app already has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, the `markte-oudio` bucket is already public, and no migration, cron or environment variable is added by this work.

After merging, confirm in the browser at `hq.buitelyn.com` → Buitelyn → Studio → **Vandag se Oorsigte** that a player appears for each published edition and that a download link saves a playable MP3.
