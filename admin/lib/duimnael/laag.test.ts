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
    const hoog: Laag = { ...reaksie({ x: 0.5, y: 0.5, grootte: 0.5 }), wydte: 800, hoogte: 1600 };
    const k = laagKas(hoog, RAAM);
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
  const teks = (belyn: "links" | "middel" | "regs", x: number): Laag => ({
    soort: "teks",
    teks: "SAKENUUS",
    kleur: "wit",
    belyn,
    plek: { x, y: 0.1, grootte: 0.09 },
  });

  it("vertaal grootte na fontgrootte, nie na breedte nie", () => {
    const k = laagKas(teks("links", 0.55), RAAM);
    expect(k.fontSize).toBe(115); // round(0.09*1280)
    expect(k.height).toBeUndefined();
  });

  it("anker links: x is die linkerrand, die blok vloei na regs", () => {
    const k = laagKas(teks("links", 0.55), RAAM);
    expect(k.left).toBe(704);
    expect(k.width).toBe(576); // 1280 - 704
  });

  it("anker regs: x is die regterrand, die blok vloei na links", () => {
    const k = laagKas(teks("regs", 0.95), RAAM);
    expect(k.left).toBe(0);
    expect(k.width).toBe(1216);
  });

  it("anker middel: die blok is simmetries om x en pas altyd in die raam", () => {
    const k = laagKas(teks("middel", 0.5), RAAM);
    expect(k.left).toBe(0);
    expect(k.width).toBe(1280);
    const skeef = laagKas(teks("middel", 0.25), RAAM);
    expect(skeef.left).toBe(0);
    expect(skeef.width).toBe(640); // 2 * min(0.25, 0.75) * 1280
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
