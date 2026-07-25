/* Local news scraper — runs on Piet's always-on Mac via launchd
   (com.buitelyn.nuus-skraper, every 15 min). Fetches RSS sources whose bot
   protection blocks Vercel's data-centre IPs and upserts the raw items into
   markte_nuus_rou; buitelyn.com/markte merges them server-side.

   Run: node --experimental-strip-types scripts/nuus-skraper.ts  (from web/) */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { dekodeer, parseNuusFeed } from "../lib/markets/nuus.ts";

const SKRAAP_BRONNE = [
  // Blocks Vercel's data-centre IPs — only reachable from here.
  { bron: "Daily Investor", url: "https://dailyinvestor.com/feed/" },
  // RSS carries only the single latest story; polling every 15 min
  // accumulates them into an archive the site can actually use.
  { bron: "BizNews", url: "https://www.biznews.com/feed" },
];

const webDir = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const lyn of readFileSync(join(webDir, ".env.local"), "utf8").split("\n")) {
  const m = lyn.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false },
});

for (const { bron, url } of SKRAAP_BRONNE) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseNuusFeed(await res.text(), bron).slice(0, 20);
    if (!items.length) {
      // BizNews's feed is often legitimately empty between stories.
      console.log(`${new Date().toISOString()} ${bron}: feed leeg — niks om te vang nie`);
      continue;
    }
    const { error } = await sb.from("markte_nuus_rou").upsert(
      items.map((i) => ({
        skakel: i.skakel,
        titel: i.titel,
        bron: i.bron,
        beskrywing: i.beskrywing,
        gepubliseer: i.gepubliseer,
      })),
      { onConflict: "skakel" }
    );
    if (error) throw new Error(error.message);
    console.log(`${new Date().toISOString()} ${bron}: ${items.length} items opgedateer`);
  } catch (fout) {
    console.error(`${new Date().toISOString()} ${bron}: FOUT — ${String(fout)}`);
  }
}

/* BizNews HTML scrape: their RSS shop window is 0-1 items, so we also read
   the first 5 articles off /collection/latest-news. Article pages are only
   fetched for links we haven't stored yet (steady state: 1 page fetch, 0
   article fetches). Real datePublished from JSON-LD matters — BizNews
   republishes old columns, and those must not fake freshness. */
const BN_UA = { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" };
const BN_NIE_ARTIKELS = new Set(["author", "events", "collection", "category", "sponsored", "tag", "page", "wp-content", "about", "contact"]);

async function skraapBizNews(): Promise<void> {
  try {
    const res = await fetch("https://www.biznews.com/collection/latest-news", {
      headers: BN_UA,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const skakels: string[] = [];
    for (const m of html.matchAll(/href="(https:\/\/www\.biznews\.com\/([a-z0-9-]+)\/[a-z0-9-]+)"/g)) {
      if (BN_NIE_ARTIKELS.has(m[2]) || skakels.includes(m[1])) continue;
      skakels.push(m[1]);
      if (skakels.length === 5) break;
    }
    if (!skakels.length) throw new Error("geen artikel-skakels gevind");

    const { data: bestaande } = await sb.from("markte_nuus_rou").select("skakel").in("skakel", skakels);
    const bekend = new Set((bestaande ?? []).map((r) => r.skakel));
    const nuwes = skakels.filter((s) => !bekend.has(s));

    for (const skakel of nuwes) {
      try {
        const blad = await fetch(skakel, { headers: BN_UA, signal: AbortSignal.timeout(15_000) });
        if (!blad.ok) continue;
        const bladHtml = await blad.text();
        const titel = dekodeer(bladHtml.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "");
        const beskrywing = dekodeer(bladHtml.match(/<meta property="og:description" content="([^"]*)"/)?.[1] ?? "");
        const datum = bladHtml.match(/"datePublished":"([^"]+)"/)?.[1];
        const gepubliseer = datum ? new Date(datum) : new Date();
        if (!titel || Number.isNaN(gepubliseer.getTime())) continue;
        const { error } = await sb.from("markte_nuus_rou").upsert(
          { skakel, titel, bron: "BizNews", beskrywing: beskrywing.slice(0, 400), gepubliseer: gepubliseer.toISOString() },
          { onConflict: "skakel" }
        );
        if (error) throw new Error(error.message);
        console.log(`${new Date().toISOString()} BizNews-blad: + ${titel.slice(0, 60)}`);
      } catch (fout) {
        console.error(`${new Date().toISOString()} BizNews-blad ${skakel}: FOUT — ${String(fout)}`);
      }
    }
    if (!nuwes.length) console.log(`${new Date().toISOString()} BizNews-blad: niks nuuts nie`);
  } catch (fout) {
    console.error(`${new Date().toISOString()} BizNews-blad: FOUT — ${String(fout)}`);
  }
}

await skraapBizNews();
