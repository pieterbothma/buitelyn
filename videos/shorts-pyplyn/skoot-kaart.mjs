/* Skoot-kaart: waar is AP in die raam, oomblik vir oomblik?

   Dit is nie 'n weelde nie. 'n 16:9-episode word 'n 9:16-short deur weg te sny,
   en hierdie program het DRIE uitlegte: AP alleen (ongeveer in die middel), AP
   links gedruk met 'n grafika regs, en volskerm-argiefmateriaal sonder AP. 'n
   Vaste middel-snit sny AP se gesig middeldeur in die tweede geval en wys niks
   van hom in die derde nie.

   Ons vra Gemini dus per raam: watter uitleg, en waar is AP horisontaal. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const VIDEO = process.argv[2];
/* Gemeet, nooit vasgedraad nie — sien transkribeer.mjs. */
const DUUR = Number(
  execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", VIDEO],
    { encoding: "utf8" }).trim()
);
const ELKE = 5;            // sekondes tussen monsters
const PER_OPROEP = 12;     // rame per Gemini-oproep
const SLEUTEL = process.env.GEMINI_API_KEY;
if (!SLEUTEL) throw new Error("GEMINI_API_KEY ontbreek");
mkdirSync("rame", { recursive: true });

const PROMPT = (tye) => `Hier is ${tye.length} rame uit 'n Afrikaanse sakenuus-program, in volgorde.

Vir ELKE raam, sê:
- "uitleg": "solo" (die aanbieder alleen, geen groot grafika), "split" (aanbieder aan een kant, 'n foto/video/grafika aan die ander), of "broll" (geen aanbieder sigbaar nie — volskerm argiefmateriaal of grafika)
- "ap": waar die aanbieder se GESIG horisontaal is, 0.0 = heel links, 1.0 = heel regs. Gebruik null as hy nie sigbaar is nie.
- "kant": "links", "middel", "regs", of null

Lewer SUIWER JSON — 'n lys van ${tye.length} objekte in dieselfde volgorde, elk:
{"uitleg":"solo|split|broll","ap":<0..1 of null>,"kant":"links|middel|regs|null"}

Net die JSON-lys, geen markdown.`;

async function groep(tye) {
  const kas = `rame/g${String(tye[0]).padStart(5,"0")}.json`;
  if (existsSync(kas)) return JSON.parse(readFileSync(kas, "utf8"));
  const dele = [{ text: PROMPT(tye) }];
  for (const t of tye) {
    const pad = `rame/f${String(t).padStart(5,"0")}.jpg`;
    if (!existsSync(pad)) {
      execFileSync("ffmpeg", ["-v","error","-ss",String(t),"-i",VIDEO,"-frames:v","1","-vf","scale=384:-1",pad,"-y"]);
    }
    dele.push({ inline_data: { mime_type: "image/jpeg", data: readFileSync(pad).toString("base64") } });
  }
  for (let poging = 1; poging <= 3; poging++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${SLEUTEL}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: dele }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 4096 } }),
        signal: AbortSignal.timeout(180_000),
      });
      const rou = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
      const lys = JSON.parse(rou);
      if (!Array.isArray(lys) || lys.length !== tye.length) throw new Error(`${lys?.length} terug vir ${tye.length} rame`);
      const uit = lys.map((x, i) => ({
        t: tye[i],
        uitleg: ["solo","split","broll"].includes(x.uitleg) ? x.uitleg : "solo",
        ap: typeof x.ap === "number" ? Math.min(1, Math.max(0, x.ap)) : null,
        kant: ["links","middel","regs"].includes(x.kant) ? x.kant : null,
      }));
      writeFileSync(kas, JSON.stringify(uit));
      return uit;
    } catch (e) {
      if (poging === 3) { console.error(`  ${tye[0]}s: ${e.message} — opgegee`); return tye.map(t => ({ t, uitleg:"solo", ap:null, kant:null })); }
    }
  }
}

const tye = [];
for (let t = 0; t < DUUR; t += ELKE) tye.push(Math.round(t));
const groepe = [];
for (let i = 0; i < tye.length; i += PER_OPROEP) groepe.push(tye.slice(i, i + PER_OPROEP));
console.error(`${tye.length} rame in ${groepe.length} oproepe`);

const alles = [];
const PARALLEL = 3;
for (let i = 0; i < groepe.length; i += PARALLEL) {
  const uit = await Promise.all(groepe.slice(i, i + PARALLEL).map(groep));
  uit.forEach(g => alles.push(...g));
  console.error(`  ${Math.min(i+PARALLEL, groepe.length)}/${groepe.length}`);
}
alles.sort((a,b) => a.t - b.t);
writeFileSync("skoot-kaart.json", JSON.stringify(alles, null, 1));
const tel = {}; alles.forEach(x => tel[x.uitleg] = (tel[x.uitleg]||0)+1);
console.error(`\n✓ ${alles.length} rame → skoot-kaart.json`);
console.error("  " + Object.entries(tel).map(([k,v]) => `${k}: ${v} (${Math.round(v/alles.length*100)}%)`).join(", "));
