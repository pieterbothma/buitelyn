import { describe, expect, it } from "vitest";
import { beeldPlasing, klemFokus } from "./beeld";
import type { BeeldBron } from "./spec";

const bron = (wydte: number, hoogte: number, ekstra: Partial<BeeldBron> = {}): BeeldBron => ({
  url: "https://x/y.png",
  wydte,
  hoogte,
  fokusX: 0.5,
  fokusY: 0.5,
  zoem: 1,
  deursigtig: false,
  ...ekstra,
});

describe("beeldPlasing", () => {
  it("dek die gleuf presies by zoem 1 — nooit 'n gaping nie", () => {
    // Landskap 2000x1000 in 'n vierkante 1000x1000-gleuf: hoogte pas, wydte oor.
    const p = beeldPlasing(bron(2000, 1000), { w: 1000, h: 1000 });
    expect(p.height).toBe(1000);
    expect(p.width).toBe(2000);
    expect(p.left).toBe(-500); // gesentreer
    expect(p.top).toBe(0);
    // Die beeld bedek die gleuf heeltemal
    expect(p.left).toBeLessThanOrEqual(0);
    expect(p.left + p.width).toBeGreaterThanOrEqual(1000);
  });

  it("respekteer die fokuspunt op die as wat oorloop", () => {
    const links = beeldPlasing(bron(2000, 1000, { fokusX: 0 }), { w: 1000, h: 1000 });
    const regs = beeldPlasing(bron(2000, 1000, { fokusX: 1 }), { w: 1000, h: 1000 });
    expect(links.left).toBe(0);
    expect(regs.left).toBe(-1000);
  });

  it("ignoreer die fokus op 'n as wat presies pas", () => {
    // Die hoogte pas presies, so fokusY kan niks skuif nie.
    const p = beeldPlasing(bron(2000, 1000, { fokusY: 1 }), { w: 1000, h: 1000 });
    expect(p.top).toBe(0);
  });

  it("zoem in vanaf die dek-skaal, nie vanaf die natuurlike grootte nie", () => {
    const een = beeldPlasing(bron(1000, 1000), { w: 500, h: 500 });
    const twee = beeldPlasing(bron(1000, 1000, { zoem: 2 }), { w: 500, h: 500 });
    expect(een.width).toBe(500);
    expect(twee.width).toBe(1000);
    expect(twee.left).toBe(-250); // gesentreer op dubbel die grootte
  });

  it("hanteer 'n portret-beeld in 'n storie-gleuf", () => {
    const p = beeldPlasing(bron(1080, 1350), { w: 1080, h: 1920 });
    // Die hoogte moet die gleuf vul; die wydte loop oor.
    expect(p.height).toBeGreaterThanOrEqual(1920);
    expect(p.width).toBeGreaterThanOrEqual(1080);
  });

  it("hanteer 'n 1:1-beeld in 'n 1:1-gleuf sonder oorskot", () => {
    const p = beeldPlasing(bron(800, 800), { w: 800, h: 800 });
    expect(p).toEqual({ left: 0, top: 0, width: 800, height: 800 });
  });
});

describe("klemFokus", () => {
  it("gee 0 terug op 'n as sonder oorskot", () => {
    expect(klemFokus(bron(1000, 1000, { fokusX: 0.9, fokusY: 0.9 }), { w: 1000, h: 1000 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("klem buite-perke waardes binne 0..1", () => {
    const f = klemFokus(bron(4000, 1000, { fokusX: 5 }), { w: 1000, h: 1000 });
    expect(f.x).toBe(1);
  });
});
