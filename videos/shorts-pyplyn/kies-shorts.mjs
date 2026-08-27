/* Kies short-kandidate uit die transkripsie, met die skoot-kaart langsaan.
   Die skoot-kaart is nie versiering nie: 'n oomblik wat lekker klink maar oor
   'n split-skoot val, sny in 9:16 AP se gesig middeldeur. */
import { readFileSync, writeFileSync } from "node:fs";
const SLEUTEL = process.env.GEMINI_API_KEY;
const segs = JSON.parse(readFileSync("transkripsie-sekondes.json", "utf8"));
const kaart = JSON.parse(readFileSync("skoot-kaart.json", "utf8"));

const mmss = (t) => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}`;
const teks = segs.map(s => `[${s.begin.toFixed(1)}] ${s.teks}`).join("\n");

const PROMPT = `Hieronder is die volledige transkripsie van 'n 18:39 Afrikaanse sakenuus-episode (Buitelyn, aangebied deur AP). Elke reël begin met sy tyd in sekondes.

Kies die 8 BESTE oomblikke om as vertikale shorts (TikTok/Reels/YouTube Shorts) te sny.

Wat 'n goeie short maak:
- 'n Sterk eerste sin wat op sy eie sin maak, sonder konteks
- 'n Volledige gedagte binne 20–55 sekondes
- 'n Mening, 'n verrassende syfer, 'n sterk stelling of 'n storie — nie 'n opsomming nie
- Dit moet klaarmaak wat dit begin. Nie middel-in afsny nie.

Lewer SUIWER JSON — 'n lys van 8:
{"begin":<sekondes>,"einde":<sekondes>,"titel":"<kort Afrikaanse titel>","hook":"<die eerste sin, verbatim>","hoekom":"<een sin: hoekom dit werk>","onderwerp":"<naspers|handelsoorlog|dolly|ander>"}

KRITIEK
- "begin" moet op 'n natuurlike sinsbegin val, presies by 'n reël se tyd hierbo.
- 20 tot 55 sekondes lank. Verkies 25–45.
- Kies uit VERSKILLENDE dele van die episode, nie almal uit een onderwerp nie.
- Net die JSON-lys.

TRANSKRIPSIE:
${teks}`;

/* Stukkende JSON hier is 'n AFGEKAPTE antwoord, nie 'n slegte antwoord nie —
   dieselfde les as die transkripsie-skrip. Vra weer; red eers as die laaste
   poging ook breek, en red dan die heel objekte wat wel deurgekom het. */
async function vraKandidate() {
  for (let poging = 1; poging <= 3; poging++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${SLEUTEL}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json", maxOutputTokens: 16384 } }),
      signal: AbortSignal.timeout(240_000),
    });
    const rou = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    try {
      const lys = JSON.parse(rou);
      if (Array.isArray(lys) && lys.length) return lys;
    } catch {
      if (poging < 3) { console.error(`  afgekap, probeer weer (${poging}/3)`); continue; }
      const gered = [...rou.matchAll(/\{[^{}]*"begin"[^{}]*\}/g)]
        .map(m => { try { return JSON.parse(m[0]); } catch { return null; } }).filter(Boolean);
      console.error(`  steeds afgekap — ${gered.length} kandidate gered`);
      return gered;
    }
  }
  return [];
}
const kandidate = (await vraKandidate()).filter(k => typeof k?.begin === "number" && typeof k?.einde === "number");
if (!kandidate.length) { console.error("geen kandidate nie"); process.exit(1); }

/* Vir elke kandidaat: watter uitlegte val binne sy venster? Dit besleg hoe die
   9:16-snit moet werk, en waarsku waar dit glad nie gaan werk nie. */
const verryk = kandidate.map(k => {
  const binne = kaart.filter(x => x.t >= k.begin - 2 && x.t <= k.einde + 2);
  const tel = {}; binne.forEach(x => tel[x.uitleg] = (tel[x.uitleg]||0)+1);
  const oorheers = Object.entries(tel).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "solo";
  const aps = binne.map(x => x.ap).filter(x => x !== null);
  const gemAp = aps.length ? aps.reduce((a,b)=>a+b,0)/aps.length : null;
  const gemengd = Object.keys(tel).length > 1;
  return { ...k, duur: +(k.einde - k.begin).toFixed(1), uitleg: oorheers, gemengd,
           uitlegte: tel, apX: gemAp === null ? null : +gemAp.toFixed(2) };
});
writeFileSync("shorts.json", JSON.stringify(verryk, null, 1));

for (const k of verryk) {
  const snit = k.uitleg === "split" ? "LINKS-snit" : k.uitleg === "broll" ? "b-roll (geen AP)" : "middel-snit";
  console.log(`\n${mmss(k.begin)}–${mmss(k.einde)}  (${k.duur}s)  [${k.onderwerp}]`);
  console.log(`  ${k.titel}`);
  console.log(`  hook: "${k.hook}"`);
  console.log(`  ${k.hoekom}`);
  console.log(`  9:16: ${snit}${k.apX !== null ? ` (AP x=${k.apX})` : ""}${k.gemengd ? ` — GEMENG: ${JSON.stringify(k.uitlegte)}` : ""}`);
}
