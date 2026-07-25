import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";

export type NuusItem = {
  titel: string;
  skakel: string;
  bron: string;
  opsomming: string;
  gepubliseer: string; // ISO
};

export type RouItem = Omit<NuusItem, "opsomming"> & { beskrywing: string };

/* SA-first mix; Yahoo's general feed is US-front-page noise, so it stays out.
   Business Day's "markets" section is almost all WATCH video posts — we pull
   companies + economy instead and drop WATCH items everywhere. */
const BRONNE = [
  {
    bron: "Business Day",
    url: "https://www.businesslive.co.za/arc/outboundfeeds/rss/category/companies/?outputType=xml",
  },
  {
    bron: "Business Day",
    url: "https://www.businesslive.co.za/arc/outboundfeeds/rss/category/economy/?outputType=xml",
  },
  { bron: "Moneyweb", url: "https://www.moneyweb.co.za/feed/" },
  { bron: "Daily Investor", url: "https://dailyinvestor.com/feed/" },
];

const MAX_ITEMS = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function text(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "__cdata" in value) return text(value.__cdata);
  return "";
}

const NAAM_ENTITEITE: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…",
};

function dekodeer(teks: string): string {
  return teks
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (heel, naam) => NAAM_ENTITEITE[naam.toLowerCase()] ?? heel);
}

function stripTags(html: string): string {
  return dekodeer(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNuusFeed(xml: string, bron: string): RouItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: "__cdata" });
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel) return [];
  const rawItems = channel.item == null ? [] : Array.isArray(channel.item) ? channel.item : [channel.item];
  return (
    rawItems
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any): RouItem | null => {
        const titel = dekodeer(text(item.title)).trim();
        const skakel = text(item.link).trim();
        const wanneer = new Date(text(item.pubDate));
        if (!titel || !skakel || Number.isNaN(wanneer.getTime())) return null;
        if (/^WATCH\b/i.test(titel)) return null;
        return {
          titel,
          skakel,
          bron,
          gepubliseer: wanneer.toISOString(),
          beskrywing: stripTags(text(item.description)).slice(0, 400),
        };
      })
      .filter((i: RouItem | null): i is RouItem => i !== null)
  );
}

export function voegSaam(lyste: RouItem[][], maks = MAX_ITEMS): RouItem[] {
  const gesien = new Set<string>();
  return lyste
    .flat()
    .filter((i) => (gesien.has(i.skakel) ? false : (gesien.add(i.skakel), true)))
    .sort((a, b) => new Date(b.gepubliseer).getTime() - new Date(a.gepubliseer).getTime())
    .slice(0, maks);
}

async function haalBronne(): Promise<RouItem[]> {
  const resultate = await Promise.allSettled(
    BRONNE.map(async ({ bron, url }) => {
      const res = await fetch(url, {
        next: { revalidate: 900 },
        headers: { "user-agent": "Mozilla/5.0 (compatible; BuitelynMarkte/1.0)" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`${bron}: ${res.status}`);
      return parseNuusFeed(await res.text(), bron);
    })
  );
  return voegSaam(resultate.map((r) => (r.status === "fulfilled" ? r.value : [])));
}

async function skryfOpsommings(items: RouItem[]): Promise<string[]> {
  const lys = items
    .map((i, n) => `${n + 1}. [${i.bron}] ${i.titel} — ${i.beskrywing || "(geen uittreksel)"}`)
    .join("\n");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Hier is ${items.length} finansiële nuusberigte (Engels). Skryf vir elkeen 'n een-sin Afrikaanse opsomming in jou eie woorde (±18 woorde, feitelik, Buitelyn se stem: helder, geen clichés, geen aanhalings uit die bron). Antwoord as 'n JSON-lys van ${items.length} strings in dieselfde volgorde.\n\n${lys}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );
  const data = await res.json();
  const geparseer = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]");
  if (!Array.isArray(geparseer) || geparseer.length !== items.length) throw new Error("opsomming-vorm");
  return geparseer.map((s) => String(s));
}

/* Summaries are cached by article URL in the ap-hq Supabase, so Gemini only
   ever writes each article once no matter how often the page revalidates. */
export async function kryNuus(): Promise<NuusItem[]> {
  try {
    const items = await haalBronne();
    if (!items.length) return [];
    if (!process.env.APHQ_SUPABASE_URL || !process.env.APHQ_SUPABASE_SERVICE_KEY) {
      return items.map((i) => ({ ...i, opsomming: "" }));
    }
    const sb = createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const { data: bestaande } = await sb
      .from("markte_nuus")
      .select("skakel, opsomming")
      .in("skakel", items.map((i) => i.skakel));
    const kaart = new Map((bestaande ?? []).map((r) => [r.skakel, r.opsomming as string]));

    const nuwes = items.filter((i) => !kaart.has(i.skakel));
    if (nuwes.length) {
      try {
        const opsommings = await skryfOpsommings(nuwes);
        const rye = nuwes.map((i, n) => ({
          skakel: i.skakel,
          titel: i.titel,
          bron: i.bron,
          opsomming: opsommings[n],
          gepubliseer: i.gepubliseer,
        }));
        await sb.from("markte_nuus").upsert(rye, { onConflict: "skakel" });
        rye.forEach((r) => kaart.set(r.skakel, r.opsomming));
      } catch {
        /* wys sonder opsomming; volgende render probeer weer */
      }
    }
    return items.map(({ beskrywing: _b, ...i }) => ({ ...i, opsomming: kaart.get(i.skakel) ?? "" }));
  } catch {
    return [];
  }
}
