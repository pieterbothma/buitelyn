# Winkel-mandjie en Produkte-bestuur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow /winkel from one product with direct checkout into a catalogue with a cart, multi-item orders, and full product management in AP HQ.

**Architecture:** Builds on the existing `winkel` branch (worktree `/Users/pieterbothma/die-buitelyn-winkel`). Cart is client-side localStorage — the server re-validates and re-prices every line at checkout. Orders switch from one item to an `items` jsonb array; `winkel_betaal` v2 decrements every line atomically and idempotently. AP HQ gains `/produkte` (create/edit/photos/variants/stock) behind the existing `toegelaat()` allowlist; photos live in a public Supabase Storage bucket, uploaded server-side only.

**Tech Stack:** Next.js 16, Supabase (Postgres + Storage), Paystack (unchanged), Resend (unchanged), vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-winkel-mandjie-design.md`

## Global Constraints

- All copy/comments Afrikaans; brand "Buitelyn", never "Die Buitelyn"; money integer cents via `rand()`.
- Shipping stays **R99 flat per order** (`VERSENDING_SENT = 9900`), regardless of line count.
- Sizes for clothing: `S, M, L, XL, XXL`. Sizeless products have `grootte = null`.
- New products seed `aktief=false` with placeholder prices (description marked `PLEKHOUER`); variants seed `voorraad=0`.
- No deletes anywhere: products and variants are hidden (`aktief=false`), never removed — orders reference variants.
- Legal facts only from `web/lib/wetlik.ts`. Service-role writes only server-side, gated by `toegelaat()` in admin.
- Tests: `cd web && npx vitest run lib/winkel`; builds: `npx next build` in web/ and admin/.
- Work on branch `winkel` in the worktree. The Paystack webhook route's logic is UNCHANGED except the `BestellingRy` type it passes along.

---

### Task 1: Migrasie 0002 — items-bestellings, kleur×grootte, storage, saad

**Files:**
- Create: `supabase/migrasies/0002_mandjie.sql`
- Controller applies via Supabase MCP (project `mstrumkcyfikbddfmjti`, name `winkel_mandjie`); implementer writes + commits the file ONLY.

**Interfaces:**
- Produces: `winkel_produkte.slug/fotos`, `winkel_variante.grootte/aktief`, `winkel_bestellings.items` (array of `{variant_id, naam, kleur, grootte, prys_sent, aantal}`), `winkel_betaal(p_verwysing) returns jsonb` (same envelope: `{klaar_verwerk, bestelling?}`), storage bucket `winkel-fotos` (public read).

- [ ] **Step 1: Write** `supabase/migrasies/0002_mandjie.sql`:

```sql
-- Mandjie: 'n bestelling dra nou 'n LYS items; variante kry grootte en 'n
-- versteek-vlag; produkte kry slug en fotos (die winkel lees NET produkte.fotos).
alter table winkel_produkte
  add column slug text,
  add column fotos jsonb not null default '[]';
update winkel_produkte set slug = 'seepunt-pet' where naam = 'Seepunt-pet';
update winkel_produkte set fotos = '["/winkel/pet-af871d.jpg","/winkel/pet-24c6ee.jpg","/winkel/pet-8bf0de.jpg","/winkel/pet-e50849.jpg","/winkel/pet-9398f3.jpg","/winkel/pet-d9952d.jpg"]'
  where slug = 'seepunt-pet';
alter table winkel_produkte alter column slug set not null;
alter table winkel_produkte add constraint winkel_produkte_slug_uniek unique (slug);

alter table winkel_variante
  add column grootte text,
  add column aktief boolean not null default true,
  drop column fotos;  -- nooit gelees nie; produkte.fotos is die galery
alter table winkel_variante add constraint winkel_variante_kombinasie_uniek
  unique (produk_id, kleur, grootte);

-- Bestellings: item+variant_id word items (lys). Die bestaande rye word omgeskakel.
alter table winkel_bestellings add column items jsonb;
update winkel_bestellings set items = jsonb_build_array(
  item || jsonb_build_object('variant_id', variant_id, 'grootte', null));
alter table winkel_bestellings alter column items set not null;
alter table winkel_bestellings drop column item, drop column variant_id;

-- winkel_betaal v2: trek ELKE lyn se voorraad af. Selfde idempotensie-kontrak.
create or replace function winkel_betaal(p_verwysing text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b winkel_bestellings; lyn jsonb;
begin
  update winkel_bestellings set status='betaal', betaal_op=now()
    where verwysing=p_verwysing and status='begin'
    returning * into b;
  if b.id is null then
    return jsonb_build_object('klaar_verwerk', true);
  end if;
  for lyn in select * from jsonb_array_elements(b.items) loop
    update winkel_variante
      set voorraad = greatest(0, voorraad - (lyn->>'aantal')::int)
      where id = (lyn->>'variant_id')::uuid;
  end loop;
  return jsonb_build_object('klaar_verwerk', false, 'bestelling', to_jsonb(b));
end $$;
revoke execute on function winkel_betaal(text) from public, anon, authenticated;
grant execute on function winkel_betaal(text) to service_role;

-- Berging: openbare lees, skryf NET via service role (HQ se aksies).
insert into storage.buckets (id, name, public) values ('winkel-fotos','winkel-fotos', true)
  on conflict (id) do nothing;
create policy "winkel-fotos publiek leesbaar" on storage.objects
  for select using (bucket_id = 'winkel-fotos');

-- Saad: vier Buitelyn-produkte, VERSTEEK, plekhouer-pryse, voorraad 0.
-- AP flip aktief en vul voorraad in HQ wanneer sy plaaslike voorraad eg is.
with p as (
  insert into winkel_produkte (naam, beskrywing, prys_sent, aktief, slug) values
    ('Buitelyn-koffiebeker', 'PLEKHOUER-beskrywing en -prys — AP bevestig.', 19900, false, 'buitelyn-koffiebeker'),
    ('Buitelyn-keps',        'PLEKHOUER-beskrywing en -prys — AP bevestig.', 29900, false, 'buitelyn-keps'),
    ('Buitelyn-trui',        'PLEKHOUER-beskrywing en -prys — AP bevestig.', 59900, false, 'buitelyn-trui'),
    ('Buitelyn-hemp',        'PLEKHOUER-beskrywing en -prys — AP bevestig.', 44900, false, 'buitelyn-hemp')
  returning id, slug)
insert into winkel_variante (produk_id, kleur, grootte, voorraad)
select id, k.kleur, g.grootte, 0 from p
cross join lateral (values ('Swart'),('Wit')) as k(kleur)
cross join lateral (
  select unnest(array['S','M','L','XL','XXL']) as grootte
  where p.slug in ('buitelyn-trui','buitelyn-hemp')
  union all select null where p.slug in ('buitelyn-koffiebeker','buitelyn-keps')
) as g;
```

- [ ] **Step 2: Sanity-read** the SQL once against the current schema (0001) — every altered column exists, no typos in slugs.
- [ ] **Step 3: Commit** `git add supabase/migrasies/0002_mandjie.sql && git commit -m "feat(winkel): migrasie 0002 — items-bestellings, kleur×grootte, storage-bucket, saad"`
- [ ] **Step 4 (controller):** apply via MCP `apply_migration`, then verify: `select slug, jsonb_array_length(fotos) from winkel_produkte order by slug;` → 5 rows, pet has 6 fotos; `select count(*) from winkel_variante where grootte is not null;` → 20 (2 kleure × 5 groottes × 2 produkte); `select items from winkel_bestellings limit 1;` → array with 1 element carrying variant_id; `select winkel_betaal('bestaan-nie');` → `{"klaar_verwerk": true}`.

### Task 2: Valideerder en e-posse v2 — items-lyste

**Files:**
- Modify: `web/lib/winkel/valideer.ts`, `web/lib/winkel/valideer.test.ts`, `web/lib/winkel/epos.ts`, `web/lib/winkel/epos.test.ts`

**Interfaces:**
- Produces: `type BestelLyn = { variant_id: string; naam: string; kleur: string; grootte: string | null; prys_sent: number; aantal: number }`; `BestellingInvoer` becomes `{ items: { variantId: string; aantal: number }[]; koper: {...}; adres: {...} }` (koper/adres unchanged); `valideerBestelling` same signature, now validating `items` (1–20 lines, each UUID + aantal 1–5, no duplicate variantIds); `BestellingRy.items: BestelLyn[]` replaces `.item`; `koperEposHtml`/`eienaarEposHtml` render one row per line; `rand`, `stuurBestellingEposse`, `stuurEienaarWaarskuwing`, `eienaarOnderwerp` unchanged.

- [ ] **Step 1: Update the validator tests** — replace the single `variantId/aantal` fixture fields with `items: [{ variantId: "3f1c0e5e-0000-0000-0000-000000000001", aantal: 1 }]` and add:

```ts
it("weier 'n leë items-lys, 'n duplikaat-variant en meer as 20 lyne", () => {
  expect(valideerBestelling({ ...goed, items: [] }).ok).toBe(false);
  expect(valideerBestelling({ ...goed, items: [goed.items[0], { ...goed.items[0] }] }).ok).toBe(false);
  expect(valideerBestelling({ ...goed, items: Array.from({ length: 21 }, (_, i) => ({
    variantId: `3f1c0e5e-0000-0000-0000-0000000000${String(i).padStart(2, "0")}`, aantal: 1 })) }).ok).toBe(false);
});
it("aanvaar twee verskillende lyne", () => {
  const r = valideerBestelling({ ...goed, items: [goed.items[0],
    { variantId: "3f1c0e5e-0000-0000-0000-000000000002", aantal: 2 }] });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.data.items).toHaveLength(2);
});
```

- [ ] **Step 2: Run** → FAIL (shape mismatch).
- [ ] **Step 3: Rework `valideer.ts`** — `BestellingInvoer.items: { variantId: string; aantal: number }[]`; validation: array, 1–20 lines, each variantId UUID + aantal integer 1–5, `new Set(ids).size === ids.length` for duplicates (fout: "Dieselfde item is twee keer in die mandjie."); koper/adres logic untouched.
- [ ] **Step 4: Update the email tests** — fixture becomes `items: [{ variant_id: "…0001", naam: "Seepunt-pet", kleur: "Seegroen", grootte: null, prys_sent: 25000, aantal: 2 }, { variant_id: "…0002", naam: "Buitelyn-trui", kleur: "Swart", grootte: "L", prys_sent: 59900, aantal: 1 }]`, `item_sent: 109900`, `totaal_sent: 119800`; assert the koper email contains BOTH `"2 x Seepunt-pet"` and `"Buitelyn-trui (Swart, L)"` and `"R1 198,00"`… **NOTE:** `rand()` has no thousands separator — assert `"R1198,00"` exactly as `rand(119800)` produces. Assert eienaar email lists both lines. Keep the `[TOETS]` tests.
- [ ] **Step 5: Rework `epos.ts`** — `BestellingRy.items: BestelLyn[]`; render lines as `${l.aantal} x ${esc(l.naam)} (${esc(l.kleur)}${l.grootte ? `, ${esc(l.grootte)}` : ""}) — ${rand(l.prys_sent * l.aantal)}<br/>` joined, then Versending + Totaal rows as before. Same treatment in `eienaarEposHtml`.
- [ ] **Step 6: Run** `npx vitest run lib/winkel` → all green.
- [ ] **Step 7: Commit** `git commit -m "feat(winkel): validasie en e-posse dra items-lyste"` (add the four files).

### Task 3: Tjek-roete v2 — multi-lyn pryse en voorraad

**Files:**
- Modify: `web/app/api/winkel/tjek/route.ts`

**Interfaces:**
- Consumes: `valideerBestelling` v2, `BestelLyn` (Task 2).
- Produces: `POST /api/winkel/tjek` accepting `{items, koper, adres, webwerf}`; on a stock problem returns `{ fout, variantId }` 409 naming the guilty line; success unchanged `{url}`.

- [ ] **Step 1: Rework the route.** After validation, fetch all lines in ONE query:

```ts
  const ids = v.data.items.map(i => i.variantId);
  const { data: variante } = await sb.from("winkel_variante")
    .select("id, kleur, grootte, voorraad, aktief, winkel_produkte(naam, prys_sent, aktief)")
    .in("id", ids);
```

  Then per requested line: find its variant (missing/inactive product/inactive variant → 404 `{fout: "Daardie produk is nie beskikbaar nie.", variantId}`); `voorraad < aantal` → 409 `{fout: variant.voorraad === 0 ? `${naam} (${kleur}${grootte ? `, ${grootte}` : ""}) is uitverkoop.` : `Net ${voorraad} oor van ${naam} (${kleur}…).`, variantId}`. Build `items: BestelLyn[]` snapshot from DB values only, `item_sent = Σ prys_sent*aantal`, `totaal = item_sent + VERSENDING_SENT`. Insert with `items` (no `variant_id` column any more). Everything else (honeypot, verwysing, Paystack initialize, callback) unchanged.
- [ ] **Step 2:** `npx next build` → clean. `npx vitest run lib/winkel` → green.
- [ ] **Step 3: Commit** `git commit -m "feat(winkel): tjek-roete aanvaar 'n mandjie se lyne"`.

### Task 4: Mandjie-kern (kliënt) + kentekens

**Files:**
- Create: `web/lib/winkel/mandjie.ts` (client module), `web/lib/winkel/mandjie.test.ts`, `web/components/winkel/mandjie-kenteken.tsx`

**Interfaces:**
- Produces: `type MandjieItem = { variantId: string; aantal: number }`; pure helpers `voegBy(lys, variantId, aantal): MandjieItem[]` (merge duplicates, clamp 1–5), `verwyder(lys, variantId)`, `stelAantal(lys, variantId, aantal)` (0 removes), `telling(lys): number`; hook `useMandjie(): { items, voegBy, verwyder, stelAantal, maakLeeg }` persisting to localStorage key `"winkel-mandjie"` (try/catch both directions, corrupt JSON → empty), syncing across tabs via the `storage` event; `<MandjieKenteken />` — link to `/winkel/mandjie` showing `telling` (hidden at 0), rendered by winkel pages only.

- [ ] **Step 1: Write failing tests** for the PURE helpers (no DOM):

```ts
import { describe, expect, it } from "vitest";
import { voegBy, verwyder, stelAantal, telling } from "./mandjie";
const A = "3f1c0e5e-0000-0000-0000-000000000001", B = "3f1c0e5e-0000-0000-0000-000000000002";
describe("mandjie-helpers", () => {
  it("voeg by en smelt duplikate saam, geklem op 5", () => {
    let l = voegBy([], A, 2); l = voegBy(l, A, 4);
    expect(l).toEqual([{ variantId: A, aantal: 5 }]);
  });
  it("verwyder en stel aantal (0 verwyder)", () => {
    let l = voegBy(voegBy([], A, 1), B, 2);
    expect(verwyder(l, A)).toEqual([{ variantId: B, aantal: 2 }]);
    expect(stelAantal(l, B, 0)).toEqual([{ variantId: A, aantal: 1 }]);
  });
  it("telling som die aantalle", () => {
    expect(telling(voegBy(voegBy([], A, 2), B, 3))).toBe(5);
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** pure helpers + the `useMandjie` hook (`"use client"`; `useState` from localStorage lazy init, `useEffect` write-through, `storage`-event listener) + the badge component (monochrome, small count bubble). **Step 4: Run** → PASS; `npx next build` clean. **Step 5: Commit** `git commit -m "feat(winkel): mandjie-kern in localStorage met kenteken"`.

### Task 5: Katalogus — rooster en produkblad

**Files:**
- Create: `web/app/winkel/[slug]/page.tsx`, `web/app/winkel/[slug]/koopkaart.tsx` (client)
- Modify: `web/app/winkel/page.tsx` (becomes the grid), delete `web/app/winkel/koopvorm.tsx` (its form half moves to Task 6's betaal page)

**Interfaces:**
- Consumes: `useMandjie`, `<MandjieKenteken />` (Task 4), `rand` (epos), DB shape `winkel_produkte(id, naam, beskrywing, prys_sent, slug, fotos, winkel_variante(id, kleur, grootte, voorraad, aktief))`.
- Produces: `/winkel` grid; `/winkel/[slug]` detail. Both render `<TopBar />`/`<Footer />` + `<MandjieKenteken />`.

- [ ] **Step 1: Grid page** (`page.tsx`, server): anon client fetch `winkel_produkte` where `aktief=true` with variants; show only products having ≥1 variant `aktief && voorraad > 0`… **no** — show products with ≥1 `aktief` variant, and badge "Uitverkoop" over the card when ALL active variants have `voorraad === 0` (an out-of-stock product stays visible; a hidden one does not). Card: first foto via `next/image`, naam, `rand(prys_sent)`, link `/winkel/${slug}`. Grid `sm:grid-cols-2`, monochrome.
- [ ] **Step 2: Detail page** (`[slug]/page.tsx`, server): `params` is a Promise; fetch by slug (`aktief=true`, else `notFound()`); pass product to `<Koopkaart produk={…} />`.
- [ ] **Step 3: Koopkaart** (client): gallery (hero + thumbnails from `fotos`); kleur picker over distinct active-variant colours; grootte picker shown only when the product has any non-null grootte — sizes ordered `S,M,L,XL,XXL`, a kleur×grootte combo with `voorraad === 0` disabled with "Uitverkoop"; hoeveelheid 1–5; running price `rand(prys_sent * aantal)`; button **"Voeg by mandjie"** → `voegBy(variantId van die gekose kombinasie)` → inline confirmation strip "In die mandjie ✓ — <Link href='/winkel/mandjie'>Gaan na mandjie</Link> · <Link href='/winkel'>Koop verder</Link>". No delivery form on this page any more.
- [ ] **Step 4:** `npx next build` clean (the old `/winkel` single-page flow is gone; `koopvorm.tsx` deleted). **Step 5: Commit** `git commit -m "feat(winkel): produk-rooster en produkblaaie met voeg-by-mandjie"`.

### Task 6: Mandjie- en betaal-bladsye

**Files:**
- Create: `web/app/winkel/mandjie/page.tsx` (server shell) + `web/app/winkel/mandjie/mandjie-lys.tsx` (client), `web/app/winkel/betaal/page.tsx` (server shell) + `web/app/winkel/betaal/betaalvorm.tsx` (client)

**Interfaces:**
- Consumes: `useMandjie` (Task 4); `POST /api/winkel/tjek` v2 `{items, koper, adres, webwerf}` returning `{url}` | `{fout, variantId?}` (Task 3); `PROVINSIES`, `VERSENDING_SENT`, `rand`.
- Produces: `/winkel/mandjie`, `/winkel/betaal`. Chrome + kenteken on both.

- [ ] **Step 1: Mandjie-lys** (client): resolve the cart's variantIds to live data via ONE anon Supabase query from the client (`winkel_variante.in("id", ids)` with product join — public read RLS covers it); lines: foto, naam, kleur/grootte, `rand(prys_sent)`, aantal-select 1–5 (`stelAantal`), verwyder-knoppie; a line whose variant vanished or went inactive shows "Nie meer beskikbaar nie" with only verwyder; a line with `voorraad < aantal` shows "Nog net X oor" and clamps; totals: items + `rand(VERSENDING_SENT)` + totaal; empty cart → "Jou mandjie is leeg" + link `/winkel`; button "Gaan betaal" → `/winkel/betaal` (disabled when empty or any unavailable line).
- [ ] **Step 2: Betaalvorm** (client): order summary (read-only lines + totals, same resolution as mandjie) above the delivery form — the form is the exact labels/autocomplete/POPIA/honeypot form from the old koopvorm (lift it verbatim, including the consent line and inline `{fout}` display); submit posts `{items: mandjie, koper, adres, webwerf}`; on `{fout, variantId}` highlight the guilty summary line; on `{url}` → `maakLeeg()` FIRST, then `window.location.assign(url)`. (Clearing before redirect: if payment fails the buyer re-adds — an un-cleared cart after payment double-buys on the next visit, the worse failure.)
- [ ] **Step 3:** `npx next build` clean. **Step 4: Commit** `git commit -m "feat(winkel): mandjie- en betaal-bladsye"`.

### Task 7: Webhook-tipe en HQ-bestellings op items

**Files:**
- Modify: `web/app/api/winkel/paystack/route.ts` (only if the `BestellingRy` cast needs it — logic unchanged), `admin/app/bestellings/page.tsx`, `admin/lib/winkel.ts`

**Interfaces:**
- Consumes: `BestellingRy.items` (Task 2), DB `items` (Task 1).
- Produces: admin `Bestelling` type carries `items: BestelLyn[]`-shaped array.

- [ ] **Step 1:** Update `admin/lib/winkel.ts` types: `Bestelling.items: { variant_id: string; naam: string; kleur: string; grootte: string | null; prys_sent: number; aantal: number }[]` (drop `item`). **Step 2:** `bestellings/page.tsx`: row summary shows `Σ aantal` items + first line's naam ("2 items — Seepunt-pet …"); the `<details>` expansion lists every line (`aantal x naam (kleur, grootte) — rand(prys_sent*aantal)`) above the address block. Voorraad strip: group variants per product — `naam: Σ voorraad oor` with a link to `/produkte` (Task 9 provides the page; the link may 404 until then within this branch — acceptable inside one plan). **Step 3:** Check the webhook route compiles against the new `BestellingRy` (the `uitslag.bestelling` cast — `to_jsonb(b)` now carries `items`; no logic change). Both builds clean; vitest green. **Step 4: Commit** `git commit -m "feat(bestellings): lynitems in AP HQ en 'n produk-gegroepeerde voorraad-strook"`.

### Task 8: HQ produkte-aksies (bedien-kant)

**Files:**
- Create: `admin/app/actions-produkte.ts`
- Modify: `admin/lib/winkel.ts` (add types + `GROOTTES` const)

**Interfaces:**
- Produces (all `"use server"`, all gated: `supabaseServer→auth.getUser`, `!user || !toegelaat(user.email)` → throw, then `winkelKlient()`; all end `revalidatePath("/produkte")`):
  - `skepProduk(f: FormData): Promise<{id: string}>` — naam, beskrywing, prysRand (string → `Math.round(parseFloat*100)`, reject NaN/≤0), slug derived `naam.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")`; inserts `aktief=false`.
  - `wysigProduk(id, f: FormData)` — same fields, slug editable.
  - `stelProdukAktief(id: string, aktief: boolean)`
  - `stelVoorraad(variantId: string, voorraad: number)` — integer ≥ 0.
  - `stelVariantAktief(variantId: string, aktief: boolean)`
  - `voegKleurBy(produkId: string, kleur: string)` — if the product has sized variants, insert the kleur across ALL of `GROOTTES = ["S","M","L","XL","XXL"]`; else one `grootte: null` variant; all `voorraad 0`; duplicate kleur → throw "Daardie kleur bestaan reeds."
  - `voegGrootteBy(produkId: string, grootte: string)` — insert that grootte for every existing kleur of the product (skip combos that exist), voorraad 0.
  - `laaiFotoOp(produkId: string, f: FormData)` — file field `foto`; reject > 4MB or non-`image/(jpeg|png|webp)`; upload via `winkelKlient().storage.from("winkel-fotos").upload(\`${produkId}/${Date.now()}-${naam-geskoon}\`, buffer, { contentType })`; append its public URL (`storage.from("winkel-fotos").getPublicUrl(pad).data.publicUrl`) to `produkte.fotos`.
  - `verwyderFoto(produkId: string, url: string)` — remove the URL from `fotos` (leave the storage object; cheap, and orders/emails may reference it).
  - `skuifFoto(produkId: string, url: string, rigting: "op" | "af")` — reorder within `fotos`.
- [ ] **Step 1:** Implement exactly the above (read `admin/app/actions-winkel.ts` first and mirror its gate/comment style). **Step 2:** `cd admin && npx next build` clean. **Step 3: Commit** `git commit -m "feat(produkte): bedien-kant produk-, variant- en foto-aksies agter die toegangslys"`.

### Task 9: HQ /produkte-blad

**Files:**
- Create: `admin/app/produkte/page.tsx` (server) + `admin/app/produkte/produk-kaart.tsx` (client)
- Modify: `admin/components/shell.tsx` (nav: "Produkte" under WINKEL beside Bestellings), `admin/next.config.ts` if `next/image` needs the Supabase storage host (check first — HQ may render fotos with plain `<img>`; plain `<img>` is acceptable here and avoids config).

**Interfaces:**
- Consumes: every action from Task 8; `rand`, `GROOTTES` from `admin/lib/winkel.ts`.

- [ ] **Step 1: Page** (server, force-dynamic): `winkelKlient()` fetch ALL products (active and hidden) + variants ordered kleur, grootte (S→XXL via `GROOTTES` index); render one `<ProdukKaart>` per product + a "Nuwe produk" create form (naam/beskrywing/prysRand → `skepProduk`).
- [ ] **Step 2: ProdukKaart** (client): header — naam, `rand(prys_sent)`, slug, aktief-toggle (`stelProdukAktief`; visually distinct VERSTEEK badge when off); edit form (naam/beskrywing/prysRand/slug → `wysigProduk`); fotos strip — thumbnails with op/af/verwyder (Task 8 actions) + file-input → `laaiFotoOp`; variant matrix — sized products render a kleur-row × grootte-column grid of stock number inputs (blur/submit → `stelVoorraad`), sizeless products one input per kleur; per-variant versteek toggle (`stelVariantAktief`); "Voeg kleur by" text input + button; "Voeg grootte by" only for sized products. All copy Afrikaans, monochrome, no deletes anywhere.
- [ ] **Step 3:** `cd admin && npx next build` clean. **Step 4: Commit** `git commit -m "feat(produkte): produkte-bestuur in AP HQ — skep, fotos, variante, voorraad"`.

### Task 10: Voorskou-E2E (controller + Piet)

- [ ] Push branch; redeploy admin preview via CLI (`cd admin && npx vercel deploy`) since ap-hq has no git integration.
- [ ] Controller E2E on the preview: grid shows only the pet; detail page add-to-cart → mandjie → betaal → Paystack test → webhook → DB `items` correct, BOTH-variant multi-item order decrements each variant once; replay idempotent; uitverkoop line at tjek names the variantId; HQ /produkte: create product → upload foto → add kleur/grootte → set stock → aktief-toggle → appears on winkel grid; voorraad edit reflects on shop.
- [ ] Piet: own purchase (webhook-URL fix pending from round 1), `[TOETS]` emails, HQ login, Merk-as-gestuur.
- [ ] STOP before merge: go-live is its own decision (Live keys, real stock, AP's prices).

## Self-review (done)

- Spec coverage: migrasie/storage/saad (T1), items-validasie+e-posse (T2), tjek v2 (T3), mandjie (T4), rooster+produkblad (T5), mandjie/betaal-bladsye (T6), webhook-tipe+HQ-bestellings+voorraad-strook (T7), produkte-aksies (T8), /produkte-UI (T9), toets (T10). Gaps: none.
- Placeholders: none; every code step carries code or exact field/behaviour lists.
- Type consistency: `BestelLyn` (T2) = the jsonb shape T1 writes and T3 snapshots; `MandjieItem` consistent T4→T6; action names T8 = usages T9; `GROOTTES` defined T8, consumed T9.
