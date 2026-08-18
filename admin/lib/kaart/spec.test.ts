import { describe, expect, it } from "vitest";
import { normaliseerBeeld, normaliseerKaart, normaliseerSpek, verstekSpec } from "./spec";
import { STYLE } from "./register";

describe("normaliseerBeeld", () => {
  it("weier 'n data:-URL", () => {
    // Invariant: 'n beeld is 'n PUBLIEKE URL voordat dit ooit deel van 'n spec
    // word. 'n data:-URL breek satori se bateperk én kan nooit aan Buffer
    // gegee word nie.
    expect(normaliseerBeeld({ url: "data:image/png;base64,iVBOR" })).toBeNull();
  });

  it("weier WebP", () => {
    // Satori dekodeer WebP nie betroubaar nie — die kaart word stil blank.
    expect(normaliseerBeeld({ url: "https://x/y.webp" })).toBeNull();
    expect(normaliseerBeeld({ url: "https://x/y.webp?v=2" })).toBeNull();
  });

  it("aanvaar 'n gewone https-PNG en vul verstekwaardes in", () => {
    expect(normaliseerBeeld({ url: "https://x/y.png" })).toEqual({
      url: "https://x/y.png",
      wydte: 1000,
      hoogte: 1000,
      fokusX: 0.5,
      fokusY: 0.5,
      zoem: 1,
      deursigtig: false,
    });
  });

  it("klem fokus en zoem binne perke", () => {
    const b = normaliseerBeeld({ url: "https://x/y.jpg", fokusX: 9, fokusY: -3, zoem: 99 });
    expect(b).toMatchObject({ fokusX: 1, fokusY: 0, zoem: 4 });
  });
});

describe("normaliseerSpek", () => {
  it("val terug na kop-beeld by onbekende gemors", () => {
    expect(normaliseerSpek(null).styl).toBe("kop-beeld");
    expect(normaliseerSpek({ styl: "onsin" }).styl).toBe("kop-beeld");
  });

  it("gee elke veld 'n waarde — nooit undefined nie", () => {
    // 'n spec wat deur jsonb ÉN 'n gegenereerde vorm gaan, moet volledig wees.
    for (const styl of Object.keys(STYLE) as (keyof typeof STYLE)[]) {
      const spec = normaliseerSpek({ styl });
      for (const [sleutel, waarde] of Object.entries(spec)) {
        expect(waarde, `${styl}.${sleutel}`).not.toBeUndefined();
      }
    }
  });

  it("gooi leë lys-items weg en kap by ses af", () => {
    const spec = normaliseerSpek({
      styl: "lys",
      items: ["een", "  ", "twee", "drie", "vier", "vyf", "ses", "sewe"],
    });
    expect(spec.styl === "lys" && spec.items).toEqual([
      "een", "twee", "drie", "vier", "vyf", "ses",
    ]);
  });

  it("beperk teks tot die register se maksimums", () => {
    const spec = normaliseerSpek({ styl: "groot-getal", getal: "1234567890123456789" });
    expect(spec.styl === "groot-getal" && spec.getal.length).toBe(12);
  });
});

describe("normaliseerKaart", () => {
  it("gee veilige verstekwaardes vir vorm en vel", () => {
    const k = normaliseerKaart({});
    expect(k.vorm).toBe("vierkant");
    expect(k.vel).toBe("paper");
    expect(k.merk).toBe(true);
  });

  it("aanvaar 'n geldige vorm en vel", () => {
    expect(normaliseerKaart({ vorm: "storie", vel: "ink" })).toMatchObject({
      vorm: "storie",
      vel: "ink",
    });
  });
});

describe("register", () => {
  it("het 'n definisie vir elke styl in die unie", () => {
    for (const styl of Object.keys(STYLE) as (keyof typeof STYLE)[]) {
      expect(STYLE[styl].vorms.length).toBeGreaterThan(0);
      expect(STYLE[styl].velde.length).toBeGreaterThan(0);
      expect(STYLE[styl].verstek().styl).toBe(styl);
    }
  });

  it("se veld-sleutels bestaan almal op die verstek-spec", () => {
    // Dit is wat die gegenereerde vorm laat werk: elke sleutel is 'n plat
    // sleutel op die spec-objek, geen gepunte paaie nie.
    for (const styl of Object.keys(STYLE) as (keyof typeof STYLE)[]) {
      const spec = verstekSpec(styl) as Record<string, unknown>;
      for (const veld of STYLE[styl].velde) {
        expect(Object.keys(spec), `${styl}.${veld.sleutel}`).toContain(veld.sleutel);
      }
    }
  });
});
