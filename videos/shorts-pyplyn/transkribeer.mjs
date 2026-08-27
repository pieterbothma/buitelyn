/* Gestukte Gemini-transkripsie.
   Een oproep oor 6:31 dryf: die fout was −0,2s by 7s, −3,5s by 33s en +8,7s
   by 299s — dit bou op en draai selfs van teken om. Gemini skat tydstempels
   deur te luister; dit is nie 'n forced aligner nie. Oor 'n kort venster is
   die skatting goed, so ons sny die klank in vensters met 'n BEKENDE begintyd
   en tel dit by. Die fout kan dan nie oor 'n venster heen opbou nie.
   Die goue reël bly heel: alles is steeds Gemini. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const OUD = "audio.mp3";
const UIT = "transkripsie-sekondes.json";
const VENSTER = 30;   // sekondes per venster
const OORVLEUEL = 2;  // sekondes oorvleueling sodat 'n woord nie middeldeur gesny word nie
/* GEMEET, nooit vasgedraad nie. Die eerste weergawe het die vorige episode se
   384,70s gehou; op 'n langer episode sny dit die res stil af en niemand sien
   dit nie, want die lêer lyk verder heeltemal reg. */
const DUUR = Number(
  execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", OUD],
    { encoding: "utf8" }).trim()
);
const SLEUTEL = process.env.GEMINI_API_KEY;
if (!SLEUTEL) throw new Error("GEMINI_API_KEY ontbreek");

mkdirSync("stukke", { recursive: true });

const PROMPT = (lengte) => `Dit is 'n brokkie uit 'n Afrikaanse sakenuus-program (Buitelyn). Die hoofaanbieder is 'n man (AP). Daar kan gaste of ingevoegde klankgrepe wees.

Transkribeer hierdie brokkie verbatim in Afrikaans.

Lewer SUIWER JSON — 'n lys segmente, elk:
{"spreker":"man"|"vrou","begin":<sekondes>,"einde":<sekondes>,"teks":"..."}

KRITIEK
- "begin" en "einde" is SEKONDES VANAF DIE BEGIN VAN HIERDIE BROKKIE (0 tot ${lengte}). NIE minute nie. NIE vanaf die begin van die program nie.
- Breek by natuurlike sinsgrense, elke segment 2–8 sekondes.
- Suiwer Afrikaans. Behou name, maatskappye en syfers presies (bv. "Naspers", "EMN", "18,42").
- Net die JSON-lys, geen markdown.`;

async function stuk(i, begin) {
  const lengte = Math.min(VENSTER + OORVLEUEL, DUUR - begin);
  const pad = `stukke/s${String(i).padStart(2, "0")}.mp3`;
  /* Elke venster se UITSLAG word gekas, nie net sy klank nie. Gemini is
     nie-deterministies: 'n volle herlopie ruil elke keer een defek vir 'n
     ander — die stert wat afkap, 'n venster wat dun terugkom — en dit
     konvergeer nooit. Met 'n uitslag-kas bly 'n venster wat goed teruggekom
     het net so, en herstel beteken: vee daardie een se .json uit en loop weer. */
  const kas = `stukke/s${String(i).padStart(2, "0")}.json`;
  if (existsSync(kas)) return JSON.parse(readFileSync(kas, "utf8"));
  if (!existsSync(pad)) {
    execFileSync("ffmpeg", ["-v", "error", "-ss", String(begin), "-t", String(lengte), "-i", OUD, "-ac", "1", "-ar", "16000", "-q:a", "4", pad, "-y"]);
  }
  const b64 = readFileSync(pad).toString("base64");
  const vra = async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${SLEUTEL}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT(Math.round(lengte)) }, { inline_data: { mime_type: "audio/mp3", data: b64 } }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(180_000),
      },
    );
    const data = await res.json();
    const rou = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rou) throw new Error(`stuk ${i}: geen antwoord`);
    return rou;
  };

  /* Stukkende JSON is byna altyd 'n afgekapte antwoord, en dis 'n toevallige
     mislukking — dieselfde venster kom by die volgende poging heel terug.
     Vra dus eers weer; red eers as die tweede poging ook breek. Red-eerste
     was te gretig: dit het stil die laaste sin van die program laat val,
     want dit is juis die STERT wat afgekap word. */
  /* Die tweede mislukking is verraderliker: die venster kom GELDIG maar byna
     leeg terug — een segmentjie van 0,3s vir 32s aaneenlopende spraak. Niks
     breek nie, en die eenheid-toets hieronder lees daardie 0,3 boonop as
     minute. Dek dus albei met dieselfde herprobeer-lus, en keur 'n venster
     af wat minder as die helfte van sy eie lengte dek. Hierdie program praat
     deurlopend, so lae dekking is altyd 'n slegte antwoord, nooit stilte. */
  /* 0,75, nie 0,5 nie. Elke gesonde venster in hierdie program dek 93–107%
     van sy eie lengte; 'n halwe venster is nooit 'n geldige antwoord nie, dit
     is Gemini wat halfpad ophou. Op 0,5 het venster 10 se 59% deurgeglip en
     11s spraak stil laat wegval. */
  const DEKKING_MIN = 0.75;
  let segs = null;
  for (let poging = 1; poging <= 3; poging++) {
    const laaste = poging === 3;
    /* Die oproep self moet in dieselfde lus sit. 'n Leë antwoord of 'n
       netwerkfout by een venster het voorheen die HELE lopie omgegooi — 13
       vensters se werk weg omdat een keer niks teruggekom het nie. */
    let rou;
    try {
      rou = await vra();
    } catch (e) {
      if (!laaste) { console.error(`  stuk ${i}: ${e.message}, probeer weer (${poging}/3)`); continue; }
      console.error(`  stuk ${i}: ${e.message} — venster opgegee`);
      segs = [];
      break;
    }
    let kandidaat;
    try {
      kandidaat = JSON.parse(rou);
    } catch {
      if (!laaste) { console.error(`  stuk ${i}: stukkende JSON, probeer weer (${poging}/3)`); continue; }
      kandidaat = [...rou.matchAll(/\{[^{}]*"begin"\s*:\s*[\d.]+[^{}]*\}/g)]
        .map((m) => { try { return JSON.parse(m[0]); } catch { return null; } })
        .filter(Boolean);
      console.error(`  stuk ${i}: steeds stukkend, ${kandidaat.length} segmente gered`);
    }
    kandidaat = (Array.isArray(kandidaat) ? kandidaat : []).filter((x) => typeof x?.begin === "number" && x?.teks);
    const span = kandidaat.length ? Math.max(...kandidaat.map((x) => x.einde ?? x.begin)) - Math.min(...kandidaat.map((x) => x.begin)) : 0;
    // 'n Minute-antwoord dek sy venster ná omskakeling wél — moenie dít afkeur nie.
    const dekking = Math.max(span, span * 60 <= lengte * 1.05 ? span * 60 : 0) / lengte;
    if (dekking >= DEKKING_MIN || laaste) {
      if (dekking < DEKKING_MIN) console.error(`  stuk ${i}: dun ná 3 pogings (dek ${(dekking * 100) | 0}%) — hou wat daar is`);
      segs = kandidaat;
      break;
    }
    console.error(`  stuk ${i}: dun antwoord (dek ${(dekking * 100) | 0}%), probeer weer (${poging}/3)`);
  }
  segs = segs ?? [];
  if (!segs.length) console.error(`  stuk ${i}: LEEG — hierdie venster het geen onderskrifte nie`);

  /* Eenheid-kontrole per venster. Vra ons 30s en is die grootste tydstempel
     0,5, dan het dit weer in minute geantwoord — dit het by die eerste poging
     oor die hele lêer gebeur, en 'n stil verkeerde eenheid is presies wat die
     onderskrifte gebreek het. */
  const maks = Math.max(...segs.map((x) => x.einde ?? x.begin));
  /* Twee toetse, nie een nie. "Klein maksimum" alleen is te lomp — 'n venster
     wat wettig ná 'n sekonde of twee klaar praat lyk presies soos minute, en
     dan word 0,59 stil 35s en spring die onderskrifte 11s vorentoe. Die tweede
     toets besleg dit: as die getalle wérklik minute is, moet maks×60 nog binne
     die venster val. Val dit buite, was dit sekondes. */
  const lykMinute = maks > 0 && maks <= lengte / 20 && maks * 60 <= lengte * 1.05;
  const faktor = lykMinute ? 60 : 1;
  if (lykMinute) console.error(`  stuk ${i}: minute bespeur (maks ${maks}), ×60`);
  else if (maks <= lengte / 20) console.error(`  stuk ${i}: kort venster (maks ${maks}s) — as sekondes gehou`);

  const uit = segs.map((x) => ({
    spreker: x.spreker === "vrou" ? "vrou" : "man",
    naam: x.spreker === "vrou" ? "Gas" : "AP",
    begin: +(begin + x.begin * faktor).toFixed(2),
    einde: +(begin + (x.einde ?? x.begin + 3) * faktor).toFixed(2),
    teks: String(x.teks).trim(),
  }));
  writeFileSync(kas, JSON.stringify(uit));
  return uit;
}

const beginne = [];
for (let t = 0; t < DUUR; t += VENSTER) beginne.push(t);
console.error(`${beginne.length} vensters van ${VENSTER}s (+${OORVLEUEL}s oorvleueling)`);

const alles = [];
const PARALLEL = 4;
for (let i = 0; i < beginne.length; i += PARALLEL) {
  const groep = beginne.slice(i, i + PARALLEL).map((b, j) => stuk(i + j, b));
  const uit = await Promise.all(groep);
  uit.forEach((segs, j) => alles.push({ i: i + j, segs }));
  console.error(`  ${Math.min(i + PARALLEL, beginne.length)}/${beginne.length} klaar`);
}
alles.sort((a, b) => a.i - b.i);

/* Voeg saam en gooi die oorvleuel-duplikate weg.
   Die ou reël het enige segment laat val wat begin voordat die vorige geëindig
   het — en dit het by 'n vensternaat 6,2s spraak stil verloor: chunk 1 se
   eerste segment begin binne die oorvleueling maar loop ver daarbuite uit, met
   heeltemal ander woorde. 'n Oorvleuelende BEGIN is dus nie bewys van 'n
   herhaling nie. Toets eerder die twee dinge wat dit wel bewys: die segment
   eindig binne die vorige een, of sy woorde staan reeds daar. Andersins hou
   dit en knip net sy begin by die naat vas. */
const woorde = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
const herhaal = (nuut, oud) => {
  const a = woorde(nuut);
  if (!a.length) return true;
  return woorde(oud).join(" ").includes(a.slice(0, Math.min(5, a.length)).join(" "));
};

const saam = [];
let laatval = 0, geknip = 0;
for (const { segs } of alles) {
  for (const s of segs) {
    const vorige = saam.at(-1);
    if (vorige && s.begin < vorige.einde - 0.35) {
      if (s.einde <= vorige.einde + 0.35 || herhaal(s.teks, vorige.teks)) { laatval++; continue; }
      s.begin = vorige.einde;
      geknip++;
    }
    if (s.einde <= s.begin) s.einde = s.begin + 1.5;
    saam.push(s);
  }
}
console.error(`  ${laatval} duplikate laat val, ${geknip} by die naat geknip`);

/* Sluitstuk: geen twee onderskrifte mag oorvleuel nie. Die duplikaat-toets
   hierbo laat oorvleuelings kleiner as 0,35s deur — hulle is te klein om 'n
   herhaling te wees — maar HyperFrames weier twee klanke op dieselfde baan
   wat mekaar rand, hoe klein ook al. Skuif dus die latere een tot 'n raam ná
   die vorige. Een raam by 25fps is 0,04s; dit is onsigbaar maar ondubbelsinnig. */
const RAAM = 0.04;
let geskuif = 0;
for (let i = 1; i < saam.length; i++) {
  if (saam[i].begin < saam[i - 1].einde + RAAM) {
    saam[i].begin = +(saam[i - 1].einde + RAAM).toFixed(2);
    geskuif++;
  }
  if (saam[i].einde <= saam[i].begin) saam[i].einde = +(saam[i].begin + 1.2).toFixed(2);
}
if (geskuif) console.error(`  ${geskuif} onderskrifte 'n raam vorentoe geskuif om oorvleueling te vermy`);

/* Bekende regstellings. Spraakmodelle trek seldsame eiename na iets bekends
   toe — "eMedia" word "Idia", en die e-posadresse het by die eerste poging
   heeltemal verkeerd teruggekom. Hier eerder as met die hand, sodat dit elke
   herbou oorleef. */
const REGSTELLINGS = [
  /* Seepunt Media. Gemini hoor die naam elke lopie anders: op 26 Augustus het
     dit een keer "Seepunt Media" reg gekry en een keer "c.media" gegee. Die
     e-posadresse hieronder is @seepunt.com, wat die naam bevestig.

     LET WEL: die twee reëls daaronder skryf "E Media" — dit kom uit die vorige
     episode se skrip. As die borg eintlik altyd Seepunt Media was, is daardie
     twee reëls verkeerd en moet hulle ook na "Seepunt Media" wys. Ek het hulle
     NIE self verander nie, want ek weet nie of "E Media" 'n aparte maatskappy
     is nie — Piet moet dit besleg. */
  [/\bc\.?\s?media\b/gi, "Seepunt Media"],
  [/\bsee\s?punt\s+media\b/gi, "Seepunt Media"],
  [/\bIdia\b/gi, "E Media"],
  [/\bE-?media\b/g, "E Media"],
  // Die model hoor die domein elke lopie anders ("c.com", "c.punt.com").
  // Anker dus op die naam plus enige adres-agtige res, nie op een spelling nie.
  [/\bSuzanne\s+by\s+\S+|\bsuzanne@\S+/gi, "suzanne@seepunt.com"],
  [/\bap@\S+|\bapie@\S+|\bappie@\S+/gi, "ap@seepunt.com"],
];
let getel = 0;
for (const s of saam) {
  for (const [patroon, reg] of REGSTELLINGS) {
    const voor = s.teks;
    s.teks = s.teks.replace(patroon, reg);
    if (s.teks !== voor) getel++;
  }
}

/* Die opname begin MIDDEL-IN die maatskappynaam — al wat hoorbaar is, is die
   stert van "eMedia", en Gemini maak daarvan "Idia", "Ria", "Die" of niks.
   Twee gevalle dus, want 'n vorige weergawe het net die eerste gedek: toe
   Gemini die fragment heeltemal laat val het, het die naam stil verdwyn en
   die video het met "Verhandel op die..." oopgemaak.
     1. daar staan 'n mis-gehoorde fragment voor "verhandel" → vervang dit;
     2. daar staan niks → sit die naam vooraan in.
   Die klank sê die naam nie voluit nie; die onderskrif noem dit omdat die
   kyker moet weet oor watter maatskappy dit gaan. Dit is 'n doelbewuste
   onderskrif-keuse, nie 'n transkripsiefout nie.
   NET segment 0 — "<woord> verhandel" is elders in 'n sakeprogram geldig. */
if (saam.length) {
  const eerste = saam[0].teks.trim();
  const reg = /^\S+(?=\s+verhandel\b)/i.test(eerste)
    ? eerste.replace(/^\S+(?=\s+verhandel\b)/i, "E Media")
    : /^verhandel\b/i.test(eerste)
      ? `E Media ${eerste[0].toLowerCase()}${eerste.slice(1)}`
      : eerste;
  if (reg !== eerste) { saam[0].teks = reg; getel++; }
  else if (!/^E Media\b/.test(eerste)) console.error(`  LET OP: segment 0 pas geen "E Media"-vorm nie → "${eerste.slice(0, 60)}"`);
}
for (let i = 0; i < saam.length; i++) {
  const t = saam[i].teks.trim();
  const nuweSin = i === 0 || /[.!?]$/.test(saam[i - 1].teks.trim());
  saam[i].teks = nuweSin && t && t[0] >= "a" && t[0] <= "z" ? t[0].toUpperCase() + t.slice(1) : t;
}
console.error(`  ${getel} regstellings toegepas`);

writeFileSync(UIT, JSON.stringify(saam, null, 2));
console.error(`\n✓ ${saam.length} segmente → ${UIT}`);
console.error(`  laaste einde ${saam.at(-1).einde.toFixed(1)}s (video ${DUUR}s)`);
