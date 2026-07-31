import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Simuleer 'n minimale Postgres/PostgREST-agtige gedrag oor 'n in-geheue
   rylys:
   - 'n `head:true`-navraag (soos ons eksakte tellings) gee 'n `count` terug
     sonder om ooit rye te stuur — dit word dus NOOIT deur PostgREST se
     verstek `max_rows` (1000) afgekap nie.
   - 'n gewone `select()` sonder `.range()` word wel by 1000 rye afgekap
     (presies soos die regte PostgREST) — as ons kode ooit per ongeluk 'n
     onbeperkte navraag oor twee maande sou doen, sou hierdie toets dit vang.
   - 'n `.range()`-navraag gee net daardie bladsy terug, sodat ons blaai-lus
     getoets kan word met meer as 1000 rye. */
let RYE: { gids: string; plek: string; geskep_at: string }[] = [];
let GEFAAL = false;
const MAX_RYE = 1000;

function maakVervalsteKliënt() {
  return {
    from: () => ({
      select: (_kolomme: string, opsies?: { count?: string; head?: boolean }) => {
        let van: string | undefined;
        let tot: string | undefined;
        const gefilter = () =>
          RYE.filter((r) => (!van || r.geskep_at >= van) && (!tot || r.geskep_at < tot));

        const bouer: Record<string, unknown> = {
          gte(_k: string, w: string) {
            van = w;
            return bouer;
          },
          lt(_k: string, w: string) {
            tot = w;
            return bouer;
          },
          order() {
            return bouer;
          },
          range(vanaf: number, na: number) {
            if (GEFAAL) return Promise.resolve({ data: null, error: new Error("navraag misluk") });
            return Promise.resolve({ data: gefilter().slice(vanaf, na + 1), error: null });
          },
          then(
            resolve: (v: { data: unknown; count: number | null; error: Error | null }) => void,
            reject?: (e: unknown) => void
          ) {
            try {
              if (GEFAAL) {
                resolve({ data: null, count: null, error: new Error("navraag misluk") });
                return;
              }
              const rye = gefilter();
              if (opsies?.head) {
                resolve({ data: null, count: rye.length, error: null });
              } else {
                // Simuleer PostgREST se verstek max_rows vir 'n onbeperkte select.
                resolve({ data: rye.slice(0, MAX_RYE), count: null, error: null });
              }
            } catch (e) {
              reject?.(e);
            }
          },
        };
        return bouer;
      },
    }),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => maakVervalsteKliënt(),
}));

describe("krySponsorKlikke", () => {
  beforeEach(() => {
    RYE = [];
    GEFAAL = false;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://toets.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "toets";
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("gee 'n eksakte vorigeTotaal wat NIE deur die 1000-ry-perk afgekap word nie, selfs al oorskry verlede maand dit", async () => {
    // Presies die produksie-gevaar: verlede maand het meer as 1000 rye, hierdie
    // maand het min. 'n `order(desc)`-navraag sonder eksakte telling sou die
    // hele verlede maand se rye buite die eerste 1000 (nuutste) laat val.
    const vorigeMaand = new Date(Date.UTC(2026, 5, 15)).toISOString(); // Junie
    const hierdieMaand = new Date(Date.UTC(2026, 6, 15)).toISOString(); // Julie
    for (let i = 0; i < 1500; i++) {
      RYE.push({ gids: "jse-of-oorsee", plek: "inlyn", geskep_at: vorigeMaand });
    }
    for (let i = 0; i < 5; i++) {
      RYE.push({ gids: "wat-kos-dit-om-te-bele", plek: "voetkaart", geskep_at: hierdieMaand });
    }

    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20)));
    const { krySponsorKlikke } = await import("./actions-sponsor");
    const v = await krySponsorKlikke();
    vi.useRealTimers();

    expect(v.vorigeTotaal).toBe(1500);
    expect(v.totaal).toBe(5);
    expect(v.fout).toBe(false);
  });

  it("blaai deur meer as 1000 rye vir hierdie maand sodat perGids/perPlek/CSV nie afgekap word nie", async () => {
    const hierdieMaand = new Date(Date.UTC(2026, 6, 10)).toISOString();
    for (let i = 0; i < 1500; i++) {
      RYE.push({ gids: "jse-of-oorsee", plek: "inlyn", geskep_at: hierdieMaand });
    }

    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20)));
    const { krySponsorKlikke } = await import("./actions-sponsor");
    const v = await krySponsorKlikke();
    vi.useRealTimers();

    expect(v.totaal).toBe(1500);
    expect(v.rou).toHaveLength(1500);
    expect(v.perGids).toEqual([{ gids: "jse-of-oorsee", klikke: 1500 }]);
  });

  it("merk `fout` in plaas daarvan om 'n mislukte navraag stilweg as nul te wys", async () => {
    GEFAAL = true;
    const { krySponsorKlikke } = await import("./actions-sponsor");
    const v = await krySponsorKlikke();

    expect(v.fout).toBe(true);
    expect(v.totaal).toBe(0);
  });

  it("dra 'n alle-tyd-telling sodat 'n leë maand onderskei kan word van 'niks nog ooit gelog nie'", async () => {
    RYE.push({ gids: "jse-of-oorsee", plek: "inlyn", geskep_at: new Date(Date.UTC(2026, 0, 1)).toISOString() });
    const { krySponsorKlikke } = await import("./actions-sponsor");
    const v = await krySponsorKlikke();
    expect(v.alleTydTotaal).toBe(1);
  });
});
