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
