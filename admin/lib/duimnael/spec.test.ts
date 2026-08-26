import { describe, expect, it } from "vitest";
import { GLOED_VERSTEK, RAAM, VERSTEK_PROMPT, normaliseerDuimnael } from "./spec";

describe("RAAM", () => {
  it("is 'n 16:9 YouTube-duimnael", () => {
    expect(RAAM).toEqual({ w: 1280, h: 720 });
  });
});

describe("normaliseerDuimnael", () => {
  it("gee 'n leë duimnael terug vir rommel", () => {
    expect(normaliseerDuimnael(null)).toEqual({ agtergrond: null, lae: [] });
    expect(normaliseerDuimnael("nee")).toEqual({ agtergrond: null, lae: [] });
  });

  it("klem plek-waardes binne 0..1", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "logo", kleur: "wit", plek: { x: 5, y: -3, grootte: 0.1 } }],
    });
    expect(d.lae[0].plek).toEqual({ x: 1, y: 0, grootte: 0.1 });
  });

  it("klem grootte bo 0 sodat 'n laag nooit verdwyn nie", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "logo", kleur: "ink", plek: { x: 0.5, y: 0.5, grootte: 0 } }],
    });
    expect(d.lae[0].plek.grootte).toBeGreaterThan(0);
  });

  it("gooi leë teksblokke weg — hulle render as niks", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [
        { soort: "teks", teks: "   ", kleur: "wit", belyn: "links", plek: { x: 0.1, y: 0.1, grootte: 0.08 } },
        { soort: "teks", teks: "SAKENUUS", kleur: "wit", belyn: "links", plek: { x: 0.1, y: 0.1, grootte: 0.08 } },
      ],
    });
    expect(d.lae).toHaveLength(1);
    expect(d.lae[0]).toMatchObject({ soort: "teks", teks: "SAKENUUS" });
  });

  it("verwerp onbekende laagsoorte in plaas van om hulle deur te laat", () => {
    const d = normaliseerDuimnael({ agtergrond: null, lae: [{ soort: "video", plek: { x: 0, y: 0, grootte: 1 } }] });
    expect(d.lae).toEqual([]);
  });

  it("gee 'n reaksie sy verstek-gloed as daar nie een is nie", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "reaksie", url: "https://x/a.png", wydte: 1024, hoogte: 1024, plek: { x: 0.25, y: 0.5, grootte: 0.5 } }],
    });
    expect(d.lae[0]).toMatchObject({ gloed: GLOED_VERSTEK });
  });

  it("weier 'n data:-URL — satori haal beelde by elke render weer af", () => {
    const d = normaliseerDuimnael({
      agtergrond: null,
      lae: [{ soort: "reaksie", url: "data:image/png;base64,AAA", wydte: 10, hoogte: 10, plek: { x: 0.5, y: 0.5, grootte: 0.5 } }],
    });
    expect(d.lae).toEqual([]);
  });
});

describe("VERSTEK_PROMPT", () => {
  it("vra geen sterre nie — die drama kom van die gloed", () => {
    expect(VERSTEK_PROMPT.toLowerCase()).not.toContain("star");
  });

  it("verbied mense en teks in die plaat", () => {
    const p = VERSTEK_PROMPT.toLowerCase();
    expect(p).toContain("no people");
    expect(p).toContain("no text");
  });
});
