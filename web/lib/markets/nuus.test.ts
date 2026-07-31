import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseNuusFeed, voegSaam, type RouItem } from "./nuus";

/* Vals Supabase: net genoeg ketting vir kryNuus se twee leesnavrae. */
const supabaseAntwoorde = { rou: [] as unknown[], vertaal: [] as unknown[] };
const upsertSpioen = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (tabel: string) => {
      const leeg = tabel === "markte_nuus_rou" ? supabaseAntwoorde.rou : supabaseAntwoorde.vertaal;
      const ketting = {
        select: () => ketting,
        gte: () => ketting,
        order: () => ketting,
        limit: () => Promise.resolve({ data: leeg }),
        in: () => Promise.resolve({ data: leeg }),
        upsert: (rye: unknown) => (upsertSpioen(rye), Promise.resolve({ error: null })),
      };
      return ketting;
    },
  }),
}));

function rss(items: string): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Toets</title>${items}</channel></rss>`;
}

const item = (titel: string, skakel: string, datum: string, beskrywing = "") =>
  `<item><title><![CDATA[${titel}]]></title><link>${skakel}</link><pubDate>${datum}</pubDate><description><![CDATA[${beskrywing}]]></description></item>`;

describe("parseNuusFeed", () => {
  it("unwraps CDATA, decodes entities, and normalises dates to ISO", () => {
    const xml = rss(item("SA&#8217;s rand &amp; goud", "https://x.co/a", "Fri, 24 Jul 2026 03:00:00 +0000", "<p>Die &amp; storie</p>"));
    const [i] = parseNuusFeed(xml, "Business Day");
    expect(i.titel).toBe("SA’s rand & goud");
    expect(i.bron).toBe("Business Day");
    expect(i.gepubliseer).toBe("2026-07-24T03:00:00.000Z");
    expect(i.beskrywing).toBe("Die & storie");
  });

  it("drops WATCH video posts and items without link or valid date", () => {
    const xml = rss(
      item("WATCH | Market Report", "https://x.co/w", "Fri, 24 Jul 2026 03:00:00 +0000") +
        item("Geen skakel", "", "Fri, 24 Jul 2026 03:00:00 +0000") +
        item("Slegte datum", "https://x.co/d", "nie 'n datum nie") +
        item("Geldig", "https://x.co/ok", "Fri, 24 Jul 2026 03:00:00 +0000")
    );
    expect(parseNuusFeed(xml, "Business Day").map((i) => i.titel)).toEqual(["Geldig"]);
  });

  it("returns [] for non-RSS input", () => {
    expect(parseNuusFeed("<html>sad panda</html>", "Yahoo")).toEqual([]);
  });
});

/* Die render-pad mag NOOIT op 'n LLM wag nie: skryfVertalings het vroeër
   binne kryNuus geloop, met 'n 30s-timeout op /markte se kritieke pad. */
describe("kryNuus se render-pad", () => {
  let fetchSpioen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    supabaseAntwoorde.rou = [];
    supabaseAntwoorde.vertaal = []; // niks vooraf vertaal nie — die ergste geval
    upsertSpioen.mockClear();
    process.env.APHQ_SUPABASE_URL = "https://toets.supabase.co";
    process.env.APHQ_SUPABASE_SERVICE_KEY = "toets-sleutel";
    process.env.GEMINI_API_KEY = "toets-gemini";
    fetchSpioen = vi.fn(async () =>
      new Response(
        rss(item("Rand firms against dollar", "https://bd.co/1", "Fri, 31 Jul 2026 06:00:00 +0000", "The rand gained.")),
        { status: 200, headers: { "content-type": "application/xml" } }
      )
    );
    vi.stubGlobal("fetch", fetchSpioen);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("roep nooit Gemini aan nie, selfs wanneer elke item onvertaal is", async () => {
    const { kryNuus } = await import("./nuus");
    await kryNuus();
    const geroep = fetchSpioen.mock.calls.map((c) => String(c[0]));
    expect(geroep.filter((u) => u.includes("generativelanguage.googleapis.com"))).toEqual([]);
  });

  it("wys die oorspronklike opskrif wanneer 'n vertaling nog nie bestaan nie", async () => {
    const { kryNuus } = await import("./nuus");
    const items = await kryNuus();
    expect(items).toHaveLength(1);
    expect(items[0].titel).toBe("Rand firms against dollar");
    expect(items[0].opsomming).toBe("");
  });

  it("skryf niks — genereer en stoor is die cron se werk", async () => {
    const { kryNuus } = await import("./nuus");
    await kryNuus();
    expect(upsertSpioen).not.toHaveBeenCalled();
  });
});

describe("voegSaam", () => {
  const rou = (skakel: string, gepubliseer: string, bron = "Moneyweb"): RouItem => ({
    titel: skakel,
    skakel,
    bron,
    gepubliseer,
    beskrywing: "",
  });

  it("dedupes by link, sorts newest-first, and caps the list", () => {
    const a = rou("https://x.co/1", "2026-07-24T10:00:00.000Z");
    const b = rou("https://x.co/2", "2026-07-25T08:00:00.000Z");
    const dup = rou("https://x.co/1", "2026-07-23T00:00:00.000Z", "Business Day");
    expect(voegSaam([[a], [b, dup]]).map((i) => i.skakel)).toEqual(["https://x.co/2", "https://x.co/1"]);
    expect(voegSaam([[a, b]], 1)).toHaveLength(1);
  });

  it("caps items per source so one outlet's burst can't flood the board", () => {
    // 6 Moneyweb posts newer than 3 Business Day posts; cap of 2 per source
    const vloed = Array.from({ length: 6 }, (_, n) =>
      rou(`https://mw.co/${n}`, `2026-07-25T12:0${n}:00.000Z`)
    );
    const bd = Array.from({ length: 3 }, (_, n) =>
      rou(`https://bd.co/${n}`, `2026-07-25T08:0${n}:00.000Z`, "Business Day")
    );
    const uit = voegSaam([vloed, bd], 5, 2);
    // every source keeps its cap in the first pass...
    expect(uit.filter((i) => i.bron === "Business Day")).toHaveLength(2);
    // ...and the open slot backfills from the freshest overflow (Moneyweb)
    expect(uit.filter((i) => i.bron === "Moneyweb")).toHaveLength(3);
    expect(uit).toHaveLength(5);
    expect(uit[0].gepubliseer >= uit[4].gepubliseer).toBe(true);
  });
});
