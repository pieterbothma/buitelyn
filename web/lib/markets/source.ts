/* Market data adapter. Primary: Yahoo Finance unofficial v8 chart endpoint
   (keyless; verified 2026-07-25 — v7 quote now needs crumb auth, v8 doesn't).
   Crypto-in-ZAR: CoinGecko free. Swap point for a paid provider (EODHD /
   Twelve Data) when /markte gates. All fetches are ISR-cached server-side so
   public traffic costs ~1 upstream call per interval. */

export type Kwotasie = {
  simbool: string;
  prys: number; // in the display currency (JSE ZAc already ÷100 → rand)
  geldeenheid: string;
  vorigeSluiting: number | null;
  deltaPersent: number | null;
  tyd: string | null; // ISO
};

export type ReeksPunt = { t: number; p: number };

const YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA = { "user-agent": "Mozilla/5.0 (compatible; BuitelynMarkte/1.0)" };

/** JSE equities quote in ZAc (cents). Normalise to rand. */
export function normaliseerPrys(prys: number, geldeenheid: string): { prys: number; geldeenheid: string } {
  if (geldeenheid === "ZAc") return { prys: prys / 100, geldeenheid: "ZAR" };
  return { prys, geldeenheid };
}

export function berekenDelta(prys: number, vorige: number | null): number | null {
  if (vorige == null || vorige === 0) return null;
  return ((prys - vorige) / vorige) * 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metaNaKwotasie(simbool: string, meta: any): Kwotasie | null {
  const rou = meta?.regularMarketPrice;
  if (typeof rou !== "number") return null;
  const genorm = normaliseerPrys(rou, meta.currency ?? "");
  const vorigeRou = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const vorige =
    typeof vorigeRou === "number"
      ? normaliseerPrys(vorigeRou, meta.currency ?? "").prys
      : null;
  return {
    simbool,
    prys: genorm.prys,
    geldeenheid: genorm.geldeenheid,
    vorigeSluiting: vorige,
    deltaPersent: berekenDelta(genorm.prys, vorige),
    tyd: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
  };
}

async function yahooKwotasie(simbool: string, revalidate: number): Promise<Kwotasie | null> {
  const url = `${YAHOO}/${encodeURIComponent(simbool)}?range=1d&interval=5m`;
  try {
    let res = await fetch(url, { headers: UA, next: { revalidate } });
    if (!res.ok) {
      /* Yahoo 429/5xx is verbygaande én die mislukte antwoord kan in die
         fetch-kas vassteek — een vars herprobeer sonder kas. */
      res = await fetch(url, { headers: UA, cache: "no-store" });
      if (!res.ok) return null;
    }
    const data = await res.json();
    return metaNaKwotasie(simbool, data?.chart?.result?.[0]?.meta);
  } catch {
    return null;
  }
}

/** Crypto in ZAR via CoinGecko (Yahoo has no BTC-ZAR — verified). */
async function coingeckoKwotasies(revalidate: number): Promise<Map<string, Kwotasie>> {
  const uit = new Map<string, Kwotasie>();
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=zar&include_24hr_change=true",
      { next: { revalidate: Math.max(revalidate, 300) } } // 10k/maand-perk → 5 min
    );
    if (!res.ok) return uit;
    const data = await res.json();
    const map: [string, string][] = [
      ["BTC-ZAR", "bitcoin"],
      ["ETH-ZAR", "ethereum"],
    ];
    for (const [simbool, id] of map) {
      const p = data?.[id]?.zar;
      if (typeof p !== "number") continue;
      const d = data?.[id]?.zar_24h_change ?? null;
      uit.set(simbool, {
        simbool,
        prys: p,
        geldeenheid: "ZAR",
        vorigeSluiting: typeof d === "number" ? p / (1 + d / 100) : null,
        deltaPersent: typeof d === "number" ? d : null,
        tyd: new Date().toISOString(),
      });
    }
  } catch {
    /* val stil terug */
  }
  return uit;
}

export async function getQuotes(simbole: string[], revalidate = 60): Promise<Kwotasie[]> {
  const kripto = simbole.filter((s) => s.endsWith("-ZAR"));
  const res = await Promise.all(
    simbole.filter((s) => !s.endsWith("-ZAR")).map((s) => yahooKwotasie(s, revalidate))
  );
  const kriptoMap = kripto.length ? await coingeckoKwotasies(revalidate) : new Map();
  const uit = new Map<string, Kwotasie>();
  for (const k of res) if (k) uit.set(k.simbool, k);
  for (const [s, k] of kriptoMap) uit.set(s, k);
  // behou aanvraag-volgorde
  return simbole.map((s) => uit.get(s)).filter((k): k is Kwotasie => Boolean(k));
}

export type ReeksRange = "1d" | "5d" | "1mo" | "6mo" | "ytd" | "1y" | "5y" | "max";

const REEKS_INTERVAL: Record<ReeksRange, string> = {
  "1d": "5m",
  "5d": "30m",
  "1mo": "1d",
  "6mo": "1d",
  ytd: "1d",
  "1y": "1wk",
  "5y": "1wk",
  max: "1mo",
};

export async function getSeries(
  simbool: string,
  range: ReeksRange = "1mo"
): Promise<ReeksPunt[]> {
  try {
    const interval = REEKS_INTERVAL[range] ?? "1d";
    const res = await fetch(
      `${YAHOO}/${encodeURIComponent(simbool)}?range=${range}&interval=${interval}`,
      { headers: UA, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const r = data?.chart?.result?.[0];
    const tye: number[] = r?.timestamp ?? [];
    const pryse: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const geld = r?.meta?.currency ?? "";
    return tye
      .map((t, i) => ({ t, p: pryse[i] }))
      .filter((x): x is { t: number; p: number } => typeof x.p === "number")
      .map(({ t, p }) => ({ t, p: normaliseerPrys(p, geld).prys }));
  } catch {
    return [];
  }
}
