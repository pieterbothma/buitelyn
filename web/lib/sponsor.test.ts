// web/lib/sponsor.test.ts
import { describe, expect, it } from "vitest";
import { SPONSORS, klikUrl, bestemmingMetUtm } from "./sponsor";

describe("sponsor-skakels", () => {
  it("klikUrl wys na ons eie herlei-roete, nooit direk na die borg nie", () => {
    expect(klikUrl("easyequities", "hoe-om-aandele-te-koop", "inlyn")).toBe(
      "/uit/easyequities?g=hoe-om-aandele-te-koop&p=inlyn"
    );
  });

  it("bestemmingMetUtm heg die UTM-stel aan die borg se URL", () => {
    const url = new URL(bestemmingMetUtm("easyequities", "wat-is-n-etf"));
    expect(url.origin + url.pathname).toBe(SPONSORS.easyequities.bestemming);
    expect(url.searchParams.get("utm_source")).toBe("buitelyn");
    expect(url.searchParams.get("utm_medium")).toBe("gids");
    expect(url.searchParams.get("utm_campaign")).toBe("buitelyn-gidse");
    expect(url.searchParams.get("utm_content")).toBe("wat-is-n-etf");
  });

  it("behou bestaande navraagparameters as die bestemming later 'n vennootskakel word", () => {
    const url = new URL(bestemmingMetUtm("easyequities", "jse-of-oorsee"));
    // die toets faal luidrugtig as 'n toekomstige ?ref= stilweg weggegooi word
    const basis = new URL(SPONSORS.easyequities.bestemming);
    for (const [k, v] of basis.searchParams) expect(url.searchParams.get(k)).toBe(v);
  });
});
