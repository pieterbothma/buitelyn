// web/scripts/gidse-skryf.ts
/* Skryf die gidse EEN KEER. Loop met: npm run gidse:skryf
   'n Gids wie se lêer bestaan, word oorgeslaan — hergenerering vereis dat jy
   die lêer eers doelbewus verwyder. Dis dieselfde reël as aandeel_profiele:
   goedgekeurde kopie word nooit stilweg oorgeskryf nie. */
import { writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GIDSE, type Gids } from "../lib/gidse.ts";
import { valideerGids, type GidsInhoud } from "../lib/gidse-valideer.ts";
import { AANDELE } from "../lib/aandele.ts";

const HIER = dirname(fileURLToPath(import.meta.url));
const UIT = join(HIER, "..", "content", "gidse");

function prompt(g: Gids): string {
  const name = (s: string) => AANDELE.find((a) => a.slug === s)?.naam ?? s;
  return `Jy skryf vir Buitelyn, 'n Afrikaanse finansiële nuuswerf vir gewone Suid-Afrikaners.

Skryf 'n gids met die titel "${g.titel}" wat hierdie vraag beantwoord: ${g.vraag}

STYL
- Suiwer hedendaagse Afrikaans. NOOIT Nederlandse, Vlaamse of Duitse woorde nie (bv. "achtbaan" is Nederlands). By twyfel: gebruik die Engelse leenwoord.
- Helder en rustig. Geen clichés, geen uitroeptekens, geen bemarkingstaal.
- Die handelsmerk is "Buitelyn" — NOOIT "Die Buitelyn" nie.
- 700 tot 1000 woorde in totaal.

STRENG VERBODE
- GEEN imperatiewe of aansporings nie. Moet NOOIT skryf "koop", "verkoop", "belê nou", "begin belê", "kry jou" nie. Beskryf hoe dinge wérk; sê nooit vir die leser wat om te doen nie. Dit is 'n regsvereiste (FSCA).
- Geen beloftes oor opbrengste, geen aanbevelings van spesifieke aandele nie.

INHOUD
- 4 tot 6 afdelings, elk met 'n kop en 2 tot 4 paragrawe.
- Noem hierdie maatskappye natuurlik waar dit pas: ${g.verwant.map(name).join(", ")}.
${
  g.sponsor
    ? `- "sponsor_konteks": EEN sin wat EasyEquities noem as een van die platforms wat Suid-Afrikaners gebruik. Feitelik en terloops, GEEN aanprysing, geen imperatief. Dit moet natuurlik by die res pas.`
    : `- "sponsor_konteks" moet null wees. Moenie enige platform of makelaar by die naam noem nie.`
}

Antwoord met SUIWER JSON in hierdie vorm:
{"titel": "...", "beskrywing": "...", "intro": "...", "afdelings": [{"kop": "...", "paragrawe": ["...", "..."]}], "verwant": ${JSON.stringify(g.verwant)}, "sponsor_konteks": ${g.sponsor ? '"..."' : "null"}}

"beskrywing" is die meta-beskrywing: een sin, hoogstens 155 karakters.`;
}

async function skryf(g: Gids): Promise<GidsInhoud> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt(g) }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(120_000),
    }
  );
  const data = await res.json();
  const rou = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rou) throw new Error(`geen antwoord: ${JSON.stringify(data).slice(0, 300)}`);
  return JSON.parse(rou) as GidsInhoud;
}

function skryfIndeks() {
  const lêers = readdirSync(UIT).filter((f) => f.endsWith(".json")).sort();
  const invoer = lêers.map((f, n) => `import g${n} from "./${f}";`).join("\n");
  const kaart = lêers
    .map((f, n) => `  "${f.replace(/\.json$/, "")}": g${n} as GidsInhoud,`)
    .join("\n");
  writeFileSync(
    join(UIT, "index.ts"),
    `/* OUTOMATIES GEGENEREER deur scripts/gidse-skryf.ts — moenie met die hand
   redigeer nie. Die gidse se teks self mag jy wel in die .json-lêers redigeer. */
import type { GidsInhoud } from "@/lib/gidse-valideer";
${invoer}

export const INHOUD: Record<string, GidsInhoud> = {
${kaart}
};
`
  );
}

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY ontbreek");
  mkdirSync(UIT, { recursive: true });
  for (const g of GIDSE) {
    const pad = join(UIT, `${g.slug}.json`);
    if (existsSync(pad)) {
      console.log(`⏭  ${g.slug} bestaan reeds — oorgeslaan`);
      continue;
    }
    console.log(`✍  ${g.slug} ...`);
    const inhoud = await skryf(g);
    const foute = valideerGids(inhoud, g);
    if (foute.length) {
      console.error(`✗  ${g.slug} verwerp:\n   ${foute.join("\n   ")}`);
      continue; // niks word geskryf nie — loop weer
    }
    writeFileSync(pad, JSON.stringify(inhoud, null, 2) + "\n");
    console.log(`✓  ${g.slug}`);
  }
  skryfIndeks();
  console.log("\nindex.ts hergenereer. Lees nou die diff voor jy commit.");
}

await main();
