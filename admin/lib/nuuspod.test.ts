import { describe, expect, it } from "vitest";
import { normaliseerArtikels, groepeerPerBron } from "./nuuspod";
import rou from "./__fixtures__/nuuspod-artikels.json";

describe("normaliseerArtikels", () => {
  it("lees die drie artikels", () => {
    expect(normaliseerArtikels(rou)).toHaveLength(3);
  });

  it("hou 'n artikel sonder body — die skakel is steeds werd om te wys", () => {
    const sonderBody = normaliseerArtikels(rou).find((a) => a.id === "a3");
    expect(sonderBody?.body).toBe("");
    expect(sonderBody?.headline).toBe("News24 se tweede storie");
  });

  it("gee 'n leë lys vir 'n wanvormige antwoord", () => {
    // nuuspod af, of 'n foutbladsy in plaas van JSON: die blad moet bly staan.
    expect(normaliseerArtikels({ fout: "oeps" })).toEqual([]);
    expect(normaliseerArtikels(null)).toEqual([]);
  });

  it("gooi 'n inskrywing sonder opskrif weg", () => {
    expect(normaliseerArtikels([{ id: "x", sourceName: "News24" }])).toEqual([]);
  });
});

describe("normaliseerArtikels — kategorie-objek (kremetart se ware vorm)", () => {
  // kremetart groepeer per kategorie ({ sport: [...], wereld: [...], ... }),
  // nie per bron nie — ons plat dit af en groepeer self (groepeerPerBron).
  const artikel = (oorskryf: Partial<Record<string, unknown>> = {}) => ({
    id: "k1",
    headline: "'n Opskrif",
    summary: "",
    body: "",
    sourceUrl: "https://voorbeeld.co.za/k1",
    sourceName: "Voorbeeld",
    category: "wereld",
    publishedAt: "2026-08-18T06:00:00.000Z",
    ...oorskryf,
  });

  it("plat 'n objek van skikkings af na een lys artikels", () => {
    const rou = {
      sport: [],
      wereld: [artikel({ id: "k1" }), artikel({ id: "k2" })],
      news24: [artikel({ id: "k3", sourceName: "News24" })],
    };
    expect(normaliseerArtikels(rou).map((a) => a.id).sort()).toEqual(["k1", "k2", "k3"]);
  });

  it("leë skikkings binne die objek dra niks by nie", () => {
    expect(normaliseerArtikels({ sport: [], australasie: [] })).toEqual([]);
  });

  it("gee 'n leë lys as die objek se waardes nie almal skikkings is nie", () => {
    expect(normaliseerArtikels({ fout: "oeps", wereld: [artikel()] })).toEqual([]);
  });
});

describe("groepeerPerBron", () => {
  const groepe = groepeerPerBron(normaliseerArtikels(rou));

  it("maak een groep per bron", () => {
    expect(groepe.map((g) => g.bron)).toEqual(["News24", "Maroela Media"]);
  });

  it("sorteer bronne met die meeste stories eerste", () => {
    expect(groepe[0].artikels).toHaveLength(2);
  });

  it("sorteer stories binne 'n bron nuutste eerste", () => {
    expect(groepe[0].artikels[0].id).toBe("a3");
  });
});
