# NIBS en Nuus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 'n NIBS-afdeling waar 'n mens teks plak, dit na Afrikaans vertaal, vir voorlesing gereedmaak en met 'n gekose stem laat praat — plus 'n Nuus-afdeling wat nuuspod se stories per bron in oortjies wys en 'n storie met een klik na NIBS stuur.

**Architecture:** Alles woon in die `admin/`-app (die ap-hq Vercel-projek, hq.buitelyn.com). NIBS hergebruik die bestaande `verwerkTeksVirAudio`-aksie en die bestaande TTS-roete; die enigste verandering aan die roete is een opsionele `stem`-veld. Nuus haal nuuspod se `/api/articles/all` en groepeer per bron — Buitelyn skraap niks self nie.

**Tech Stack:** Next.js 16 (App Router, bediener-komponente), TypeScript, Tailwind v4, Supabase (auth + storage), Gemini 2.5 Flash via `lib/gemini.ts`, ElevenLabs v3, vitest.

## Global Constraints

- Alle Afrikaanse teks loop deur Gemini (`skryfAfrikaans`), nooit deur 'n ander model nie.
- Geen Nederlandse of Duitse indringers in Afrikaanse kopie; die gehoor se oor wen oor die woordeboek.
- Kode en kommentaar in hierdie repo is Afrikaans — volg die omliggende styl.
- Stem-ID's mag NOOIT in die kliëntbundel beland nie. Die blaaier stuur `"alida"` of `"akker"`.
- `stem` is opsioneel op die TTS-roete en val terug op Alida; die drie bestaande oproepers word nie aangeraak nie.
- Die admin ontplooi NIE deur `git push` nie — die ap-hq-projek het geen git-koppeling nie. Ontplooi met `vercel --prod` uit `admin/`.
- Toetse loop met `npx vitest run` uit `admin/`.
- Geen nuwe afhanklikhede.

---

### Task 1: Stemme-kaart

**Files:**
- Create: `admin/lib/stemme.ts`
- Test: `admin/lib/stemme.test.ts`

**Interfaces:**
- Consumes: niks.
- Produces: `STEM_NAME: readonly ["alida", "akker"]`, `type StemNaam = "alida" | "akker"`, `kiesStem(naam?: string): string` (gee die ElevenLabs-ID terug; val terug op Alida).

- [ ] **Step 1: Write the failing test**

```ts
// admin/lib/stemme.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { kiesStem, STEM_NAME } from "./stemme";

describe("kiesStem", () => {
  beforeEach(() => {
    process.env.ELEVENLABS_VOICE_ID = "alida-id-uit-env";
  });

  it("gee Alida se ID vir 'alida'", () => {
    expect(kiesStem("alida")).toBe("alida-id-uit-env");
  });

  it("gee Akker se vaste ID vir 'akker'", () => {
    expect(kiesStem("akker")).toBe("LG95yZDEHg6fCZdQjLqj");
  });

  it("val terug op Alida wanneer niks gestuur is nie", () => {
    // Die drie bestaande oproepers stuur geen stem nie en moet aanhou werk.
    expect(kiesStem()).toBe("alida-id-uit-env");
  });

  it("val terug op Alida by 'n onbekende naam", () => {
    // Liewer die verkeerde stem as 'n mislukte generasie.
    expect(kiesStem("gerhard")).toBe("alida-id-uit-env");
  });

  it("wys presies twee stemme vir die kieser", () => {
    expect([...STEM_NAME]).toEqual(["alida", "akker"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd admin && npx vitest run lib/stemme.test.ts`
Expected: FAIL — `Failed to resolve import "./stemme"`

- [ ] **Step 3: Write minimal implementation**

```ts
// admin/lib/stemme.ts
/* Die stemme wat NIBS kan gebruik.

   Alida is die stem wat die oorsigte, die briefings en alles anders reeds
   praat; sy bly die verstek. Akker kom nuut by.

   Die ID's woon HIER en nie in die kliënt nie: 'n ElevenLabs-ID in die
   blaaier laat enigiemand met die blad oop die kwota teen enige stem
   bestee. Die blaaier stuur 'n naam; hierdie lêer maak dit 'n ID. */

export const STEM_NAME = ["alida", "akker"] as const;
export type StemNaam = (typeof STEM_NAME)[number];

const AKKER = "LG95yZDEHg6fCZdQjLqj";

export function kiesStem(naam?: string): string {
  const alida = process.env.ELEVENLABS_VOICE_ID ?? "";
  /* Onbekend of niks → Alida. 'n Onbekende naam moet nie 'n generasie laat
     val nie; die ergste geval is die verkeerde stem, wat hoorbaar is. */
  return naam === "akker" ? AKKER : alida;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd admin && npx vitest run lib/stemme.test.ts`
Expected: PASS — 5 toetse

- [ ] **Step 5: Commit**

```bash
git add admin/lib/stemme.ts admin/lib/stemme.test.ts
git commit -m "feat(admin): stemme-kaart met Alida as verstek en Akker as tweede stem"
```

---

### Task 2: `stem` op die TTS-roete

**Files:**
- Modify: `admin/app/api/audio/generate/route.ts` (die `voiceId`-blok en die request-parse)

**Interfaces:**
- Consumes: `kiesStem` uit Task 1.
- Produces: `POST /api/audio/generate` aanvaar nou `{ titel, teks, bron_url?, stem? }` waar `stem` `"alida" | "akker"` is.

- [ ] **Step 1: Voeg `stem` by die request-parse**

Vervang die bestaande parse:

```ts
  const { titel, teks, bron_url, stem } = (await request.json()) as {
    titel: string;
    teks: string;
    bron_url?: string;
    stem?: string;
  };
```

- [ ] **Step 2: Los die stem op deur `kiesStem`**

Voeg bo-aan die lêer by:

```ts
import { kiesStem } from "@/lib/stemme";
```

Vervang dan:

```ts
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
```

met:

```ts
  /* Geen `stem` → Alida, presies soos voorheen. Die oorsig-studio, die
     oudio-blad en die crons stuur niks en werk dus onveranderd voort. */
  const voiceId = kiesStem(stem);
```

Die bestaande foutkontrole daaronder bly net soos hy is — `kiesStem` gee 'n leë
string terug as `ELEVENLABS_VOICE_ID` ontbreek, en die kontrole vang dit.

- [ ] **Step 3: Verify types and build**

Run: `cd admin && npx tsc --noEmit && npx next build`
Expected: geen tipe-foute, bou slaag

- [ ] **Step 4: Bevestig die bestaande oproepers onveranderd bly**

Run: `cd admin && grep -rn "api/audio/generate" components app | grep -v route.ts`
Expected: drie treffers (`audio-studio.tsx`, `oorsig-studio.tsx` en enige cron) wat GEEN `stem` stuur — dit is die punt van die opsionele veld.

- [ ] **Step 5: Commit**

```bash
git add admin/app/api/audio/generate/route.ts
git commit -m "feat(admin): TTS-roete aanvaar 'n opsionele stem, verstek Alida"
```

---

### Task 3: Vertaal-aksie

**Files:**
- Create: `admin/app/actions-nibs.ts`

**Interfaces:**
- Consumes: `skryfAfrikaans(opdrag: string): Promise<string | null>` uit `@/lib/gemini`; `supabaseServer()` uit `@/lib/supabase/server`.
- Produces: `vertaalNaAfrikaans(teks: string): Promise<string | null>` — `null` beteken nie-aangemeld, leë teks, of Gemini het misluk.

- [ ] **Step 1: Skryf die aksie**

```ts
// admin/app/actions-nibs.ts
"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { skryfAfrikaans } from "@/lib/gemini";

/** Vertaal geplakte teks na Afrikaans vir NIBS. Die verwerk-stap (etikette,
 *  syfers in mensetaal) is 'n APARTE knoppie — hierdie een vertaal net, sodat
 *  'n mens die vertaling kan nagaan voordat dit vir die oor gemasseer word. */
export async function vertaalNaAfrikaans(teks: string): Promise<string | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !teks.trim()) return null;

  return skryfAfrikaans(
    `Vertaal hierdie teks na Afrikaans. Reëls:
- Suiwer, hedendaagse Suid-Afrikaanse Afrikaans soos 'n mens dit werklik praat.
- NOOIT Nederlandse, Vlaamse of Duitse woorde nie. As jy twyfel of 'n woord regte Afrikaans is, gebruik eerder die gewone Engelse leenwoord of 'n eenvoudiger Afrikaanse alternatief.
- Los NOOIT 'n Engelse vakterm kaal in 'n Afrikaanse sin nie — skryf in gewone Afrikaans wat bedoel word, al moet die sin heeltemal oor.
- Name, plekname, maatskappyname en syfers bly presies soos hulle is.
- Vertaal ALLES; moenie opsom, inkort of kommentaar lewer nie.
- Behou die paragraaf-indeling.
- Toets elke sin hardop: as 'n Afrikaanssprekende dit nie so sou sê nie, skryf dit oor.

Antwoord met NET die vertaling.

${teks}`
  );
}
```

- [ ] **Step 2: Verify types**

Run: `cd admin && npx tsc --noEmit`
Expected: geen foute

- [ ] **Step 3: Commit**

```bash
git add admin/app/actions-nibs.ts
git commit -m "feat(admin): vertaal-aksie vir NIBS"
```

---

### Task 4: NIBS-blad, studio-komponent en nav-skakel

**Files:**
- Create: `admin/app/w/[slug]/nibs/page.tsx`
- Create: `admin/components/nibs-studio.tsx`
- Modify: `admin/components/shell.tsx` (die `ws.slug === "buitelyn"`-blok)

**Interfaces:**
- Consumes: `vertaalNaAfrikaans` (Task 3), `verwerkTeksVirAudio` uit `@/app/actions-audio`, `POST /api/audio/generate` met `stem` (Task 2).
- Produces: die roete `/w/buitelyn/nibs`; die komponent lees `sessionStorage["nibs-bronteks"]` (Task 7 skryf dit).

- [ ] **Step 1: Skep die bediener-blad**

```tsx
// admin/app/w/[slug]/nibs/page.tsx
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { NibsStudio } from "@/components/nibs-studio";

export const dynamic = "force-dynamic";

export default async function Nibs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  /* Net Buitelyn het NIBS — dieselfde hek as die oudio-blad. */
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-2xl font-extrabold tracking-tight">Nibs</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        Plak teks, vertaal dit na Afrikaans, maak dit gereed vir voorlesing en laat een van die
        stemme dit praat.
      </p>
      <NibsStudio />
    </Shell>
  );
}
```

- [ ] **Step 2: Skep die studio-komponent**

```tsx
// admin/components/nibs-studio.tsx
"use client";

import { useEffect, useState } from "react";
import { vertaalNaAfrikaans } from "@/app/actions-nibs";
import { verwerkTeksVirAudio } from "@/app/actions-audio";

/* Twee bokse, nie een nie: die bronteks bly staan sodat 'n swak vertaling
   nooit die oorspronklike kos nie. Die skrip is die redigeerbare een — elke
   stap skryf daarin, en die etikette kan met die hand reggemaak word voor die
   stem dit praat. */
export function NibsStudio() {
  const [bron, setBron] = useState("");
  const [skrip, setSkrip] = useState("");
  const [stem, setStem] = useState<"alida" | "akker">("alida");
  const [besig, setBesig] = useState<"" | "vertaal" | "verwerk" | "oudio">("");
  const [boodskap, setBoodskap] = useState("");
  const [mp3, setMp3] = useState<string | null>(null);

  /* Nuus se "Na NIBS"-knoppie los die storie hier. Ons lees dit een keer en
     vee dit dan uit, anders duik dieselfde storie by elke besoek weer op. */
  useEffect(() => {
    try {
      const oorgedra = sessionStorage.getItem("nibs-bronteks");
      if (oorgedra) {
        setBron(oorgedra);
        sessionStorage.removeItem("nibs-bronteks");
      }
    } catch {
      /* privaat modus ens. */
    }
  }, []);

  const vertaal = async () => {
    setBesig("vertaal");
    setBoodskap("");
    try {
      const t = await vertaalNaAfrikaans(bron);
      if (t) setSkrip(t);
      else setBoodskap("Vertaling het misluk.");
    } finally {
      setBesig("");
    }
  };

  const verwerk = async () => {
    setBesig("verwerk");
    setBoodskap("");
    try {
      /* Werk op die skrip as daar een is, anders op die bronteks — plak 'n
         mens reeds Afrikaans, spring jy stap 1 oor. */
      const t = await verwerkTeksVirAudio(skrip.trim() || bron);
      if (t) setSkrip(t);
      else setBoodskap("Verwerking het misluk.");
    } finally {
      setBesig("");
    }
  };

  const maakOudio = async () => {
    setBesig("oudio");
    setBoodskap("");
    setMp3(null);
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titel: `Nibs ${new Date().toISOString().slice(0, 10)}`,
          teks: skrip,
          stem,
        }),
      });
      const d = await res.json();
      if (res.ok) setMp3(d.mp3);
      else setBoodskap(d.fout ?? "Oudio het misluk.");
    } finally {
      setBesig("");
    }
  };

  return (
    <div className="mt-6 max-w-3xl">
      <label className="text-[11px] font-extrabold uppercase tracking-[.14em]">Bronteks</label>
      <textarea
        value={bron}
        onChange={(e) => setBron(e.target.value)}
        rows={8}
        placeholder="Plak die storie hier…"
        className="mt-2 w-full resize-y border-2 border-ink bg-offwhite p-3 text-sm leading-relaxed outline-none focus:border-red"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={vertaal}
          disabled={besig !== "" || !bron.trim()}
          className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50"
        >
          {besig === "vertaal" ? "Vertaal…" : "1. Vertaal na Afrikaans"}
        </button>
        <button
          onClick={verwerk}
          disabled={besig !== "" || (!skrip.trim() && !bron.trim())}
          className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50"
        >
          {besig === "verwerk" ? "Verwerk…" : "2. Verwerk vir oudio"}
        </button>
        {boodskap ? <span className="text-sm text-red">{boodskap}</span> : null}
      </div>

      <label className="mt-6 block text-[11px] font-extrabold uppercase tracking-[.14em]">Skrip</label>
      <textarea
        value={skrip}
        onChange={(e) => setSkrip(e.target.value)}
        rows={10}
        placeholder="Die vertaalde en verwerkte teks kom hier — jy kan die etikette self regmaak."
        className="mt-2 w-full resize-y border-2 border-ink bg-offwhite p-3 text-sm leading-relaxed outline-none focus:border-red"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={stem}
          onChange={(e) => setStem(e.target.value as "alida" | "akker")}
          className="border-2 border-ink bg-offwhite px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="alida">Alida</option>
          <option value="akker">Akker</option>
        </select>
        <button
          onClick={maakOudio}
          disabled={besig !== "" || !skrip.trim()}
          className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          {besig === "oudio" ? "ElevenLabs praat… (±30s)" : "3. Genereer oudio"}
        </button>
      </div>

      {mp3 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <audio controls src={mp3} className="h-9 min-w-64 flex-1" />
          <a href={mp3} download className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper">
            Laai af
          </a>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Voeg die nav-skakel by**

In `admin/components/shell.tsx`, binne die `ws.slug === "buitelyn" ? (<>…</>)`-blok, DIREK NÁ die `Studio`-`<li>` en VOOR die `Kaart-bouer`-`<li>`:

```tsx
                        <li>
                          <Link
                            href={`/w/${ws.slug}/nibs`}
                            className="block py-1 text-[13px] text-ink/70 hover:text-ink hover:underline"
                          >
                            Nibs
                          </Link>
                        </li>
```

- [ ] **Step 4: Verify build and lint**

Run: `cd admin && npx tsc --noEmit && npx eslint app components lib && npx next build`
Expected: alles skoon

- [ ] **Step 5: Commit**

```bash
git add admin/app/w/\[slug\]/nibs admin/components/nibs-studio.tsx admin/components/shell.tsx
git commit -m "feat(admin): NIBS-afdeling — plak, vertaal, verwerk, kies 'n stem, praat"
```

- [ ] **Step 6: Ontplooi en toets in die blaaier**

```bash
cd admin && vercel --prod --yes
```

Gaan dan na `https://hq.buitelyn.com/w/buitelyn/nibs` en toets ELKE stap:
plak Engelse teks → 1 vertaal → 2 verwerk (etikette moet verskyn) → kies Alida
→ 3 genereer (speler moet speel) → kies Akker → 3 weer (die stem moet HOORBAAR
verskil). 'n Skoon bou is nie bewys nie.

---

### Task 5: nuuspod-kliënt

**Files:**
- Create: `admin/lib/nuuspod.ts`
- Create: `admin/lib/__fixtures__/nuuspod-artikels.json`
- Test: `admin/lib/nuuspod.test.ts`

**Interfaces:**
- Consumes: niks.
- Produces: `type Artikel = { id, headline, summary, body, sourceUrl, sourceName, category, publishedAt }`; `normaliseerArtikels(rou: unknown): Artikel[]`; `groepeerPerBron(artikels: Artikel[]): { bron: string; artikels: Artikel[] }[]`; `kryArtikels(): Promise<Artikel[]>`.

- [ ] **Step 1: Skep die fixture**

```json
[
  {
    "id": "a1",
    "headline": "Eskom kondig nuwe tariewe aan",
    "summary": "Die tariewe styg vanaf Julie.",
    "body": "Eskom het vandag aangekondig dat tariewe met agt persent styg.",
    "sourceUrl": "https://news24.com/a1",
    "sourceName": "News24",
    "category": "news24",
    "publishedAt": "2026-08-18T06:00:00.000Z",
    "createdAt": "2026-08-18T06:05:00.000Z"
  },
  {
    "id": "a2",
    "headline": "Maroela berig oor die weer",
    "summary": "Koue front oor die Kaap.",
    "body": "'n Koue front tref die Wes-Kaap more.",
    "sourceUrl": "https://maroelamedia.co.za/a2",
    "sourceName": "Maroela Media",
    "category": "maroela",
    "publishedAt": "2026-08-18T05:00:00.000Z",
    "createdAt": "2026-08-18T05:05:00.000Z"
  },
  {
    "id": "a3",
    "headline": "News24 se tweede storie",
    "summary": "Nog nuus.",
    "body": "",
    "sourceUrl": "https://news24.com/a3",
    "sourceName": "News24",
    "category": "news24",
    "publishedAt": "2026-08-18T07:00:00.000Z",
    "createdAt": "2026-08-18T07:05:00.000Z"
  }
]
```

- [ ] **Step 2: Write the failing test**

```ts
// admin/lib/nuuspod.test.ts
import { describe, expect, it } from "vitest";
import { normaliseerArtikels, groepeerPerBron } from "./nuuspod";
import rou from "./__fixtures__/nuuspod-artikels.json";

describe("normaliseerArtikels", () => {
  it("lees die drie artikels", () => {
    expect(normaliseerArtikels(rou)).toHaveLength(3);
  });

  it("hou 'n artikel sonder body — die skakel is steeds werd om te wys", () => {
    const sonderBody = normaliseerArtikels(rou).find((a) => a.id === "a3");
    expect(sonderBody?.body).toBe("");
    expect(sonderBody?.headline).toBe("News24 se tweede storie");
  });

  it("gee 'n leë lys vir 'n wanvormige antwoord", () => {
    // nuuspod af, of 'n foutbladsy in plaas van JSON: die blad moet bly staan.
    expect(normaliseerArtikels({ fout: "oeps" })).toEqual([]);
    expect(normaliseerArtikels(null)).toEqual([]);
  });

  it("gooi 'n inskrywing sonder opskrif weg", () => {
    expect(normaliseerArtikels([{ id: "x", sourceName: "News24" }])).toEqual([]);
  });
});

describe("groepeerPerBron", () => {
  const groepe = groepeerPerBron(normaliseerArtikels(rou));

  it("maak een groep per bron", () => {
    expect(groepe.map((g) => g.bron)).toEqual(["News24", "Maroela Media"]);
  });

  it("sorteer bronne met die meeste stories eerste", () => {
    expect(groepe[0].artikels).toHaveLength(2);
  });

  it("sorteer stories binne 'n bron nuutste eerste", () => {
    expect(groepe[0].artikels[0].id).toBe("a3");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd admin && npx vitest run lib/nuuspod.test.ts`
Expected: FAIL — `Failed to resolve import "./nuuspod"`

- [ ] **Step 4: Write minimal implementation**

```ts
// admin/lib/nuuspod.ts
/* nuuspod skraap reeds News24/Netwerk24, Maroela, The Citizen, Daily Maverick,
   PoliticsWeb, CommonSense, Daily Investor, MyBroadband en 'n stel
   internasionale strome, laat Gemini dit herskryf en stoor dit in Vercel Blob.
   Ons LEES net daardie uitslag — Buitelyn skraap niks self nie, anders betaal
   ons die skraper-API twee keer en kry twee kopieë wat uiteenloop. */

export type Artikel = {
  id: string;
  headline: string;
  summary: string;
  body: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  publishedAt: string;
};

const BRON = "https://nuuspod.co.za/api/articles/all";

function teks(waarde: unknown): string {
  return typeof waarde === "string" ? waarde : "";
}

/** Maak nuuspod se antwoord veilig. Enigiets wat nie 'n lys is nie — 'n
 *  foutobjek, 'n HTML-foutbladsy, null — word 'n leë lys, want die Nuus-blad
 *  moet bly staan al is nuuspod af. */
export function normaliseerArtikels(rou: unknown): Artikel[] {
  if (!Array.isArray(rou)) return [];
  return rou
    .map((r) => {
      const a = r as Record<string, unknown>;
      return {
        id: teks(a.id),
        headline: teks(a.headline),
        summary: teks(a.summary),
        body: teks(a.body),
        sourceUrl: teks(a.sourceUrl),
        sourceName: teks(a.sourceName),
        category: teks(a.category),
        publishedAt: teks(a.publishedAt),
      };
    })
    .filter((a) => a.headline && a.sourceName);
}

/** Groepeer per bron: die bron met die meeste stories eerste, en binne elke
 *  bron die nuutste storie eerste. Die oortjie-volgorde is dus stabiel en
 *  nuttig eerder as alfabeties. */
export function groepeerPerBron(artikels: Artikel[]): { bron: string; artikels: Artikel[] }[] {
  const kaart = new Map<string, Artikel[]>();
  for (const a of artikels) {
    const lys = kaart.get(a.sourceName) ?? [];
    lys.push(a);
    kaart.set(a.sourceName, lys);
  }
  return [...kaart.entries()]
    .map(([bron, lys]) => ({
      bron,
      artikels: [...lys].sort((x, y) => y.publishedAt.localeCompare(x.publishedAt)),
    }))
    .sort((x, y) => y.artikels.length - x.artikels.length);
}

export async function kryArtikels(): Promise<Artikel[]> {
  try {
    const res = await fetch(BRON, {
      next: { revalidate: 600 },
      headers: { "user-agent": "APHQ/1.0 (buitelyn admin)" },
    });
    if (!res.ok) return [];
    return normaliseerArtikels(await res.json());
  } catch {
    return [];
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd admin && npx vitest run lib/nuuspod.test.ts`
Expected: PASS — 7 toetse

- [ ] **Step 6: Commit**

```bash
git add admin/lib/nuuspod.ts admin/lib/nuuspod.test.ts admin/lib/__fixtures__/nuuspod-artikels.json
git commit -m "feat(admin): lees nuuspod se artikels en groepeer hulle per bron"
```

---

### Task 6: Nuus-blad, storielys en die NIBS-oorhandiging

> **PLAN-WYSIGING (2026-08-18, ná Task 5):** die spec het aangeneem
> `/api/articles/all` is oop. Dit is nie — nuuspod se `src/middleware.ts` stuur
> elke `/api/*`-pad sonder sessiekoekie na `/login`, dus kry 'n diens HTML
> terug, nie JSON nie. Die gasheer is ook nie nuuspod.co.za nie: die nuuspod
> Vercel-projek bedien **kremetart.com**.
>
> Piet het nuuspod se middleware verander (commit `74657ed`, ontplooi): 'n
> nuwe `NUUS_DEEL_SLEUTEL` laat presies die pad `/api/articles/all` deur
> wanneer die `Authorization`-kop `Bearer <sleutel>` is. Doelbewus NIE
> `CRON_SECRET` nie — daardie een maak die skrapers oop.
>
> **Stap 0 van hierdie taak** is dus om `admin/lib/nuuspod.ts` reg te maak:
>
> ```ts
> const BRON = "https://www.kremetart.com/api/articles/all";
> ```
>
> en die fetch se kop:
>
> ```ts
>     const res = await fetch(BRON, {
>       next: { revalidate: 600 },
>       headers: {
>         "user-agent": "APHQ/1.0 (buitelyn admin)",
>         /* Sonder hierdie kop stuur nuuspod se middleware ons na /login en
>            ons ontleed 'n aanmeldblad as artikels — wat stil [] gee. */
>         authorization: `Bearer ${process.env.NUUS_DEEL_SLEUTEL ?? ""}`,
>       },
>     });
> ```
>
> Die bestaande toetse in `lib/nuuspod.test.ts` raak nie hieraan nie (hulle
> toets die suiwer funksies op die vaslegging) en moet steeds slaag.

**Files:**
- Create: `admin/app/w/[slug]/nuus/page.tsx`
- Create: `admin/components/nuus-lys.tsx`
- Modify: `admin/components/shell.tsx` (nav-skakel)

**Interfaces:**
- Consumes: `kryArtikels`, `groepeerPerBron`, `type Artikel` (Task 5); die `sessionStorage["nibs-bronteks"]`-leser in `nibs-studio.tsx` (Task 4).
- Produces: die roete `/w/buitelyn/nuus?bron=<naam>`.

- [ ] **Step 1: Skep die bediener-blad**

```tsx
// admin/app/w/[slug]/nuus/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell, type Workspace } from "@/components/shell";
import { kryArtikels, groepeerPerBron } from "@/lib/nuuspod";
import { NuusLys } from "@/components/nuus-lys";

/* force-dynamic, want die blad lees koekies deur supabaseServer(). Die
   KASSERING gebeur op die fetch in kryArtikels() — `next: { revalidate: 600 }`
   werk wel onder force-dynamic, ten spyte van wat die dokumentasie impliseer
   (gemeet in hierdie repo, sien die markte-werk). */
export const dynamic = "force-dynamic";

export default async function Nuus({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bron?: string }>;
}) {
  const { slug } = await params;
  if (slug !== "buitelyn") redirect(`/w/${slug}`);
  const { bron } = await searchParams;

  const sb = await supabaseServer();
  const { data: workspaces } = await sb
    .from("workspaces")
    .select("id, slug, naam, accent")
    .order("posisie");
  const active = workspaces?.find((w) => w.slug === slug);
  if (!active) notFound();

  const groepe = groepeerPerBron(await kryArtikels());
  /* 'n Onbekende ?bron= val terug op die eerste oortjie eerder as 'n leë blad. */
  const gekies = groepe.find((g) => g.bron === bron) ?? groepe[0];

  return (
    <Shell workspaces={(workspaces ?? []) as Workspace[]} active={active as Workspace}>
      <h1 className="text-2xl font-extrabold tracking-tight">Nuus</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        Dieselfde stories wat nuuspod inbring. Stuur enige een met een klik na Nibs.
      </p>

      {groepe.length === 0 ? (
        <p className="mt-8 border-2 border-ink bg-offwhite p-4 text-sm">
          Kon nie nuus haal nie. nuuspod is dalk af — probeer later weer.
        </p>
      ) : (
        <>
          {/* Die oortjies is SKAKELS, nie kliënt-toestand nie: 'n oortjie bly
              deelbaar en oorleef 'n herlaai. Sywaartse rol op 'n smal skerm,
              want ±15 bronne sou andersins oor drie rye vou. */}
          <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-ink/15 pb-px">
            {groepe.map((g) => (
              <Link
                key={g.bron}
                href={`/w/buitelyn/nuus?bron=${encodeURIComponent(g.bron)}`}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold ${
                  g.bron === gekies.bron
                    ? "border-red text-ink"
                    : "border-transparent text-ink/60 hover:text-ink"
                }`}
              >
                {g.bron} <span className="text-ink/40">{g.artikels.length}</span>
              </Link>
            ))}
          </nav>

          <NuusLys artikels={gekies.artikels} />
        </>
      )}
    </Shell>
  );
}
```

- [ ] **Step 2: Skep die storielys**

```tsx
// admin/components/nuus-lys.tsx
"use client";

import { useRouter } from "next/navigation";
import type { Artikel } from "@/lib/nuuspod";

const tydFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function NuusLys({ artikels }: { artikels: Artikel[] }) {
  const router = useRouter();

  /* sessionStorage, NIE 'n URL-parameter nie: 'n artikel se body is duisende
     karakters en blaaiers en instaanbedieners kap URL's lank voor dit. NIBS
     lees dit een keer en vee dit dan uit. */
  const naNibs = (a: Artikel) => {
    try {
      sessionStorage.setItem("nibs-bronteks", a.body);
    } catch {
      /* privaat modus ens. */
    }
    router.push("/w/buitelyn/nibs");
  };

  return (
    <ul className="mt-4 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
      {artikels.map((a) => (
        <li key={a.id} className="flex flex-wrap items-start gap-3 p-3">
          <div className="min-w-64 flex-1">
            <p className="text-sm font-semibold">{a.headline}</p>
            {a.summary ? <p className="mt-1 text-[13px] text-ink/60">{a.summary}</p> : null}
            <p className="mt-1 text-xs text-ink/40">
              {a.publishedAt ? tydFmt.format(new Date(a.publishedAt)) : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={a.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-ink px-3 py-1.5 text-[13px] font-semibold hover:bg-paper"
            >
              Bron →
            </a>
            <button
              onClick={() => naNibs(a)}
              disabled={!a.body}
              title={a.body ? "" : "Hierdie storie het geen volteks nie"}
              className="bg-ink px-3 py-1.5 text-[13px] font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-40"
            >
              Na Nibs →
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Voeg die nav-skakel by**

In `admin/components/shell.tsx`, binne dieselfde `ws.slug === "buitelyn"`-blok, DIREK NÁ die `Nibs`-`<li>` uit Task 4:

```tsx
                        <li>
                          <Link
                            href={`/w/${ws.slug}/nuus`}
                            className="block py-1 text-[13px] text-ink/70 hover:text-ink hover:underline"
                          >
                            Nuus
                          </Link>
                        </li>
```

- [ ] **Step 4: Verify build, lint and tests**

Run: `cd admin && npx tsc --noEmit && npx eslint app components lib && npx vitest run && npx next build`
Expected: alles skoon, alle toetse slaag

- [ ] **Step 5: Commit**

```bash
git add admin/app/w/\[slug\]/nuus admin/components/nuus-lys.tsx admin/components/shell.tsx
git commit -m "feat(admin): Nuus-afdeling met oortjies per bron en 'n Na Nibs-knoppie"
```

- [ ] **Step 6: Ontplooi en toets die volle ketting**

```bash
cd admin && vercel --prod --yes
```

Gaan na `https://hq.buitelyn.com/w/buitelyn/nuus` en toets:
oortjies wissel en die URL verander saam; "Bron →" open die regte storie; "Na
Nibs →" land op NIBS MET die Bronteks reeds ingevul; 'n storie sonder volteks
se knoppie is gedeaktiveer. Loop dan die hele ketting: Na Nibs → vertaal →
verwerk → Akker → genereer, en luister of dit speel.

---

## Wat NIE in hierdie plan is nie

- Geen stoor van nibs of artikels in Buitelyn nie — albei afdelings is
  krapwerk; die MP3 land wel in die `audio-episodes`-emmer soos altyd.
- Geen soek, filter of prente op die Nuus-blad nie.
- Geen verandering aan die bestaande Oudio-blad nie.
- **Opvolg (aparte werk, ander repo):** `/api/articles/all` op nuuspod is oop
  vir enigiemand wat die URL ken. Niks daarin is geheim nie, maar dit is jou
  skraap-koste wat ander se verkeer bedien.
