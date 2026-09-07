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

  const leers = (await readdir(gids)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  console.log(`${leers.length} skote gevind, ${reeds.size} reeds in die emmer.`);

  for (const leer of leers) {
    const naam = leer.replace(/^ap_/, "").toLowerCase();
    if (reeds.has(naam)) {
      console.log(`oorslaan  ${naam} (reeds daar)`);
      continue;
    }
    const rouPad = `rou/${naam}`;
    try {
      // 1 — laai die rou skoot op sodat Replicate 'n URL het om te haal.
      const rou = await readFile(path.join(gids, leer));
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
