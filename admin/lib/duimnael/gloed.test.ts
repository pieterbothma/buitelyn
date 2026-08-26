import { describe, expect, it } from "vitest";
import { gloedKas, gloedSvgUrl } from "./gloed";
import { laagKas } from "./laag";
import { GLOED_VERSTEK, RAAM, type Laag } from "./spec";

const reaksie = (gloed = GLOED_VERSTEK): Laag => ({
  soort: "reaksie",
  url: "https://x/ap.png",
  wydte: 1024,
  hoogte: 1024,
  plek: { x: 0.25, y: 0.5, grootte: 0.5 },
  gloed,
});

describe("gloedKas", () => {
  it("sentreer die gloed op dieselfde ankerpunt as die reaksie", () => {
    const k = gloedKas(reaksie(), RAAM)!;
    const middelX = k.left + k.width / 2;
    const middelY = k.top + k.height! / 2;
    expect(middelX).toBeCloseTo(0.25 * RAAM.w, 0);
    expect(middelY).toBeCloseTo(0.5 * RAAM.h, 0);
  });

  it("is vierkantig met deursnee 2 × radius", () => {
    const k = gloedKas(reaksie(), RAAM)!;
    expect(k.width).toBe(1076); // 2 * round(0.42 * 1280) — ewe, dus presies sentreerbaar
    expect(k.height).toBe(k.width);
  });

  it("gee null wanneer die gloed af is", () => {
    expect(gloedKas(reaksie({ ...GLOED_VERSTEK, aan: false }), RAAM)).toBeNull();
  });

  it("gee null vir 'n laag wat nie 'n reaksie is nie", () => {
    const logo: Laag = { soort: "logo", kleur: "wit", plek: { x: 0.5, y: 0.5, grootte: 0.1 } };
    expect(gloedKas(logo, RAAM)).toBeNull();
  });

  it("volg laagKas se middelpunt, nie 'n tweede eie som nie", () => {
    const l = reaksie();
    const r = laagKas(l, RAAM);
    const g = gloedKas(l, RAAM)!;
    expect(g.left + g.width / 2).toBe(r.left + r.width / 2);
    expect(g.top + g.height! / 2).toBe(r.top + r.height! / 2);
  });
});

describe("gloedSvgUrl", () => {
  it("bou 'n data:-SVG met die gevraagde kleur", () => {
    const url = gloedSvgUrl({ ...GLOED_VERSTEK, kleur: "#E2231A" });
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(url)).toContain("#E2231A");
    expect(decodeURIComponent(url)).toContain("radialGradient");
  });

  it("verval na deursigtig aan die rand sodat daar geen harde sirkel is nie", () => {
    const svg = decodeURIComponent(gloedSvgUrl(GLOED_VERSTEK));
    expect(svg).toContain('stop-opacity="0"');
  });

  it("gebruik die sterkte as die middelpunt se dekking", () => {
    const svg = decodeURIComponent(gloedSvgUrl({ ...GLOED_VERSTEK, sterkte: 0.5 }));
    expect(svg).toContain('stop-opacity="0.5"');
  });

  it("enkodeer die URL sodat # en < nooit rou deurgaan nie", () => {
    const url = gloedSvgUrl(GLOED_VERSTEK);
    expect(url).not.toContain("#");
    expect(url).not.toContain("<");
  });

  it("die gradiënt-verwysing oorleef een dekodering — anders render die gloed glad nie", () => {
    const svg = decodeURIComponent(gloedSvgUrl(GLOED_VERSTEK).slice("data:image/svg+xml,".length));
    expect(svg).toContain('fill="url(#g)"');
    expect(svg).not.toContain("%23");
    expect(svg).toContain('<radialGradient id="g"');
  });
});
