import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ingevoeg: unknown[] = [];
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ gte: () => ({ limit: () => Promise.resolve({ data: onlangs }) }) }) }),
      }),
      insert: (ry: unknown) => (ingevoeg.push(ry), Promise.resolve({ error: null })),
    }),
  }),
}));
/* after() loop normaalweg ná die antwoord; in die toets voer ons dit dadelik uit
   sodat ons die skryf kan waarneem. besoekerHash gebruik regte Web Crypto
   (crypto.subtle.digest), wat oor meer as een mikro-taak resolveer — dus hou
   ons die belofte vas en wag daarvoor eksplisiet in elke toets, eerder as om
   op toevallige mikro-taak-volgorde na GET() se antwoord te staatmaak. */
let naWerk: Promise<unknown> = Promise.resolve();
vi.mock("next/server", async (orig) => {
  const mod = await orig<typeof import("next/server")>();
  return { ...mod, after: (fn: () => unknown) => { naWerk = Promise.resolve(fn()); } };
});

let onlangs: unknown[] = [];
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
// Vaste toets-sout — lank genoeg om besoekerHash se MIN_SOUT_LENGTE-vereiste
// te bevredig. Sonder hierdie sout gooi besoekerHash (opsetlik) 'n fout.
const TOETS_SOUT = "toets-sout-vir-die-uit-roete-toetse-nie-vir-produksie";

function versoek(url: string, ua: string) {
  return new NextRequest(new Request(url, { headers: { "user-agent": ua, "x-forwarded-for": "41.13.9.2" } }));
}
const ctx = (sponsor: string) => ({ params: Promise.resolve({ sponsor }) });

describe("/uit/[sponsor]", () => {
  beforeEach(() => {
    ingevoeg.length = 0;
    onlangs = [];
    process.env.APHQ_SUPABASE_URL = "https://toets.supabase.co";
    process.env.APHQ_SUPABASE_SERVICE_KEY = "toets";
    process.env.KLIK_SOUT = TOETS_SOUT;
  });

  afterEach(async () => {
    // Tap elke after()-agtergrondwerk droog voordat die volgende toets begin —
    // anders kan 'n vorige toets se ongewagte insetsel in die volgende toets
    // se `ingevoeg`-lys beland.
    await naWerk;
  });

  it("herlei met 307 na die borg, met UTM's aangeheg", async () => {
    const { GET } = await import("./[sponsor]/route");
    const res = await GET(versoek("https://www.buitelyn.com/uit/easyequities?g=jse-of-oorsee&p=inlyn", CHROME), ctx("easyequities"));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.hostname).toBe("www.easyequities.co.za");
    expect(loc.searchParams.get("utm_content")).toBe("jse-of-oorsee");
  });

  it("log 'n regte besoeker se klik", async () => {
    const { GET } = await import("./[sponsor]/route");
    await GET(versoek("https://www.buitelyn.com/uit/easyequities?g=jse-of-oorsee&p=inlyn", CHROME), ctx("easyequities"));
    await naWerk;
    expect(ingevoeg).toHaveLength(1);
    const ry = ingevoeg[0] as Record<string, string>;
    expect(ry.gids).toBe("jse-of-oorsee");
    expect(ry.plek).toBe("inlyn");
    expect(ry.besoeker_hash).toMatch(/^[a-f0-9]{32}$/);
    expect(JSON.stringify(ry)).not.toContain("41.13.9.2");
  });

  it("herlei 'n kruiper maar log hom NIE", async () => {
    const { GET } = await import("./[sponsor]/route");
    const res = await GET(versoek("https://www.buitelyn.com/uit/easyequities?g=jse-of-oorsee&p=inlyn", "Mozilla/5.0 (compatible; Googlebot/2.1)"), ctx("easyequities"));
    expect(res.status).toBe(307);
    await naWerk;
    expect(ingevoeg).toHaveLength(0);
  });

  it("ontdubbel: dieselfde besoeker + gids binne 30s tel een keer", async () => {
    onlangs = [{ id: 1 }]; // die navraag vind 'n onlangse klik
    const { GET } = await import("./[sponsor]/route");
    await GET(versoek("https://www.buitelyn.com/uit/easyequities?g=jse-of-oorsee&p=inlyn", CHROME), ctx("easyequities"));
    await naWerk;
    expect(ingevoeg).toHaveLength(0);
  });

  it("gee 404 vir 'n onbekende borg", async () => {
    const { GET } = await import("./[sponsor]/route");
    const res = await GET(versoek("https://www.buitelyn.com/uit/niemand?g=x&p=inlyn", CHROME), ctx("niemand"));
    expect(res.status).toBe(404);
  });

  it("verwerp 'n onbekende plek eerder as om vullis te log", async () => {
    const { GET } = await import("./[sponsor]/route");
    await GET(versoek("https://www.buitelyn.com/uit/easyequities?g=jse-of-oorsee&p=stout", CHROME), ctx("easyequities"));
    await naWerk;
    expect(ingevoeg).toHaveLength(0);
  });

  it("herlei steeds na die borg al gooi besoekerHash 'n fout, en rapporteer die fout eerder as om dit te sluk", async () => {
    // Simuleer die presiese produksie-gevaar: KLIK_SOUT ontbreek, so
    // besoekerHash() gooi 'n fout. Die besoeker mag dit nooit voel nie —
    // maar die missende telling moet SIGBAAR wees in die bediener-logs,
    // anders verdwyn 'n regte klik spoorloos en ondermyn dit die syfer wat
    // Buitelyn met EasyEquities onderhandel.
    delete process.env.KLIK_SOUT;
    const foutSpioen = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await import("./[sponsor]/route");
    const res = await GET(versoek("https://www.buitelyn.com/uit/easyequities?g=jse-of-oorsee&p=inlyn", CHROME), ctx("easyequities"));
    await naWerk;

    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.hostname).toBe("www.easyequities.co.za");
    expect(ingevoeg).toHaveLength(0); // die log het misluk — niks is geskryf nie
    expect(foutSpioen).toHaveBeenCalled();
    // die rou IP mag ook nooit in die foutboodskap beland nie
    for (const oproep of foutSpioen.mock.calls) {
      expect(JSON.stringify(oproep)).not.toContain("41.13.9.2");
    }

    foutSpioen.mockRestore();
  });
});
