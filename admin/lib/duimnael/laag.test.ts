import { describe, expect, it } from "vitest";
import { laagKas } from "./laag";
import { GLOED_VERSTEK, RAAM, type Laag } from "./spec";

const reaksie = (plek: { x: number; y: number; grootte: number }): Laag => ({
  soort: "reaksie",
  url: "https://x/ap.png",
  wydte: 1024,
  hoogte: 1024,
  plek,
  gloed: GLOED_VERSTEK,
  spieël: false,
});

describe("laagKas — reaksie", () => {
  it("sentreer die uitknipsel op sy ankerpunt", () => {
    const k = laagKas(reaksie({ x: 0.25, y: 0.5, grootte: 0.5 }), RAAM);
    expect(k.width).toBe(640);
    expect(k.height).toBe(640);
    expect(k.left).toBe(0); // 0.25*1280 - 320
    expect(k.top).toBe(40); // 0.5*720 - 320
  });

  it("behou die beeld se verhouding — nooit plet nie", () => {
    const hoog = { ...reaksie({ x: 0.5, y: 0.5, grootte: 0.5 }), wydte: 800, hoogte: 1600 };
    const k = laagKas(hoog as Laag, RAAM);
    expect(k.width).toBe(640);
    expect(k.height).toBe(1280);
  });
});

describe("laagKas — logo", () => {
  it("is vierkantig en gesentreer op sy ankerpunt", () => {
    const k = laagKas({ soort: "logo", kleur: "wit", plek: { x: 0.9, y: 0.85, grootte: 0.12 } }, RAAM);
    expect(k.width).toBe(154); // round(0.12*1280)
    expect(k.height).toBe(154);
    expect(k.left).toBe(1075); // round(1152 - 77)
    expect(k.top).toBe(535); // round(612 - 77)
  });
});

describe("laagKas — teks", () => {
  const teks = (belyn: "links" | "middel" | "regs", x: number, breedte = 0.45): Laag => ({
    soort: "teks",
    teks: "SAKENUUS",
    kleur: "wit",
    omlyn: "geen",
    omlynDikte: 0.06,
    belyn,
    breedte,
    plek: { x, y: 0.1, grootte: 0.09 },
  });

  it("vertaal grootte na fontgrootte, nie na breedte nie", () => {
    const k = laagKas(teks("links", 0.55), RAAM);
    expect(k.fontSize).toBe(115); // round(0.09*1280)
    expect(k.height).toBeUndefined();
  });

  it("anker links: x is die linkerrand, en die blok is so breed soos gevra", () => {
    const k = laagKas(teks("links", 0.55, 0.4), RAAM);
    expect(k.left).toBe(704);
    expect(k.width).toBe(512); // 0.4 * 1280 — NIE tot by die raamrand nie
  });

  it("anker regs: x is die regterrand, die blok strek links daarvandaan", () => {
    const k = laagKas(teks("regs", 0.95, 0.5), RAAM);
    expect(k.width).toBe(640);
    expect(k.left).toBe(1216 - 640);
  });

  it("anker middel: die blok is simmetries om x", () => {
    const k = laagKas(teks("middel", 0.5, 0.5), RAAM);
    expect(k.width).toBe(640);
    expect(k.left).toBe(640 - 320);
  });

  it("krimp die font sodat 'n lang woord nie afgesny word nie", () => {
    /* Binne 'n woord is daar geen breekpunt nie: pas dit nie, word dit stil
       afgesny. Afrikaanse saamgestelde woorde tref dit gereeld. */
    const lank: Laag = {
      soort: "teks",
      teks: "AANDELEHOUERS",
      kleur: "wit",
      omlyn: "geen",
      omlynDikte: 0.06,
      belyn: "links",
      breedte: 0.25,
      plek: { x: 0.1, y: 0.1, grootte: 0.12 },
    };
    const k = laagKas(lank, RAAM);
    expect(k.fontSize!).toBeLessThan(Math.round(0.12 * RAAM.w));
    // Die langste woord moet in die blok pas.
    expect("AANDELEHOUERS".length * k.fontSize! * 0.62).toBeLessThanOrEqual(k.width + 1);
  });

  it("laat 'n kort woord met rus — net wat nie pas nie, krimp", () => {
    const kort: Laag = {
      soort: "teks",
      teks: "JA",
      kleur: "wit",
      omlyn: "geen",
      omlynDikte: 0.06,
      belyn: "links",
      breedte: 0.6,
      plek: { x: 0.1, y: 0.1, grootte: 0.09 },
    };
    expect(laagKas(kort, RAAM).fontSize).toBe(Math.round(0.09 * RAAM.w));
  });

  it("die breedte bepaal waar die woorde omvou — dis die hele punt", () => {
    const wyd = laagKas(teks("links", 0.1, 0.8), RAAM);
    const smal = laagKas(teks("links", 0.1, 0.25), RAAM);
    expect(wyd.width).toBe(1024);
    expect(smal.width).toBe(320);
    expect(smal.left).toBe(wyd.left); // net die breedte verander
  });

  it("anker bo, nie in die middel nie — die blok groei ondertoe", () => {
    const k = laagKas(teks("links", 0.55), RAAM);
    expect(k.top).toBe(72); // round(0.1*720)
  });

  it("oorleef 'n sleep-rondreis: uit die kas terug na dieselfde x", () => {
    const oorspronklik = 0.55;
    const k = laagKas(teks("links", oorspronklik), RAAM);
    expect(k.left / RAAM.w).toBeCloseTo(oorspronklik, 5);
  });
});
