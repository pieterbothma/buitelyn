import { lunaJson, metLuna } from "../luna";

/* Die skryfwerk van /api/cron/sens: klassifikasie + een Afrikaanse sin per
   aankondiging, en die dividend-kalender se datum/bedrag-onttrekking. Luna
   eerste, Gemini as vangnet. Hier (nie in die roete nie) sodat die toetse dit
   sonder die DB of Telegram kan aanroep. */

export const TIPES = ["resultate", "dividend", "direkteure", "transaksie", "terugkoop", "notering", "agv", "kennisgewing"] as const;

type Klas = { tipe: string; opsomming: string };
export type Dividend = { bedrag_sent: number | null; ldt: string | null; betaaldatum: string | null };

const GEMINI_URL = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

async function gemini(prompt: string, temperature: number): Promise<unknown[]> {
  const res = await fetch(GEMINI_URL(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]");
}

const KLAS_SKEMA = {
  naam: "sens_klassifikasie",
  skema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { tipe: { type: "string", enum: [...TIPES] }, opsomming: { type: "string" } },
          required: ["tipe", "opsomming"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

export async function klassifiseer(items: { titel: string; maatskappy: string; teks: string }[]): Promise<Klas[]> {
  const lys = items
    .map((i, n) => `--- ITEM ${n + 1}: ${i.maatskappy} — ${i.titel}\n${i.teks.slice(0, 3500)}`)
    .join("\n\n");
  const prompt = `Hier is ${items.length} JSE SENS-aankondigings. Vir ELKE item, gee:
1. "tipe": presies een van ${TIPES.join(", ")}. (resultate=finansiële resultate/trading statements; dividend=dividende/uitkerings/rente; direkteure=direkteurshandel/-aanstellings; transaksie=verkrygings/verkope/samesmeltings; terugkoop=aandeleterugkope; notering=noterings/delistings/nuwe effekte; agv=AJV/vergadering-uitslae; kennisgewing=alles anders)
   'n Kennisgewing VAN, of 'n eis/versoek OM, 'n vergadering is kennisgewing — agv is net vir die uitslae van 'n vergadering wat reeds plaasgevind het.
2. "opsomming": EEN kort Afrikaanse sin (±20 woorde) wat vir 'n gewone belegger sê wat aangekondig is en hoekom dit saak maak. Geen jargon, geen simbole, syfers in mensetaal (R2,4 miljard). NOOIT Nederlandse of Duitse woorde nie.
   Die opsomming gaan direk na lesers — geen opmerkings oor wat in die teks ontbreek of nie vermeld word nie; sê net wat aangekondig is.

Antwoord SLEGS met 'n JSON-lys: [{"tipe":"...","opsomming":"..."}] — presies ${items.length} items, in volgorde.

${lys}`;
  const uit = (await metLuna(
    "sens",
    async () => {
      const r = await lunaJson<{ items: Klas[] }>(
        `${prompt}\n\n(Die antwoord-skema vou die lys in {"items": [...]}.)`,
        KLAS_SKEMA,
        { maksUit: 4000, timeoutMs: 90_000 }
      );
      if (r.items.length !== items.length) throw new Error(`vorm ${r.items.length}/${items.length}`);
      return r.items;
    },
    () => gemini(prompt, 0.2)
  )) as Klas[];
  return items.map((_, n) => ({
    tipe: TIPES.includes((uit[n]?.tipe ?? "") as (typeof TIPES)[number]) ? uit[n].tipe : "kennisgewing",
    opsomming: (uit[n]?.opsomming ?? "").slice(0, 300) || "",
  }));
}

const DIVIDEND_SKEMA = {
  naam: "dividend_onttrekking",
  skema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            bedrag_sent: { type: ["number", "null"] },
            ldt: { type: ["string", "null"] },
            betaaldatum: { type: ["string", "null"] },
          },
          required: ["bedrag_sent", "ldt", "betaaldatum"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

export async function onttrekDividende(dividende: { maatskappy: string; teks: string }[]): Promise<Dividend[]> {
  const dPrompt = `Hier is ${dividende.length} JSE-dividend-aankondigings. Onttrek vir ELKE item:
- "bedrag_sent": die dividend in SENT per aandeel (bv. 190 vir 190 sent; as net rand gegee, skakel om; null as onduidelik)
- "ldt": laaste dag om te verhandel ("last day to trade", LDT) as YYYY-MM-DD (null as afwesig)
- "betaaldatum": betaaldatum ("payment date") as YYYY-MM-DD (null as afwesig)
Antwoord SLEGS met 'n JSON-lys van presies ${dividende.length} objekte in volgorde.

${dividende.map((x, n) => `--- ITEM ${n + 1}: ${x.maatskappy}\n${x.teks.slice(0, 3000)}`).join("\n\n")}`;
  return (await metLuna(
    "sens-dividend",
    async () => {
      const r = await lunaJson<{ items: Dividend[] }>(
        `${dPrompt}\n\n(Die antwoord-skema vou die lys in {"items": [...]}.)`,
        DIVIDEND_SKEMA,
        { maksUit: 2000, timeoutMs: 60_000 }
      );
      if (r.items.length !== dividende.length) throw new Error(`vorm ${r.items.length}/${dividende.length}`);
      return r.items;
    },
    () => gemini(dPrompt, 0)
  )) as Dividend[];
}
