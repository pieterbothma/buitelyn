/* Local news scraper — runs on Piet's always-on Mac via launchd
   (com.buitelyn.nuus-skraper, every 15 min). Fetches RSS sources whose bot
   protection blocks Vercel's data-centre IPs and upserts the raw items into
   markte_nuus_rou; buitelyn.com/markte merges them server-side.

   Run: node --experimental-strip-types scripts/nuus-skraper.ts  (from web/) */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseNuusFeed } from "../lib/markets/nuus.ts";

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
    if (!items.length) throw new Error("geen items");
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
