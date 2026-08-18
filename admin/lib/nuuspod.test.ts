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

  it("stoor 'n onontleedbare datumstring as leeg pleks van te gooi", () => {
    // een slegte datum uit een van 19 bo-liggende bronne mag nie die hele
    // Nuus-blad met 'n RangeError laat val nie (sien nuus-lys.tsx se new Date()).
    // (let wel: Date.parse ontleed "18 Augustus 2026" eintlik lenig via
    // prefix-ooreenstemming — "om 14:00" agteraan is wat dit eg onontleedbaar maak.)
    const a = normaliseerArtikels([
      {
        id: "x",
        headline: "'n Opskrif",
        sourceName: "News24",
        publishedAt: "18 Augustus 2026 om 14:00",
      },
    ]);
    expect(a).toHaveLength(1);
    expect(a[0].publishedAt).toBe("");
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

  it("filter ekstra skalêre sleutels uit pleks van alles weg te gooi", () => {
    // die dag wat kremetart 'n skalêre sleutel soos { total: 355 } byvoeg,
    // mag dit nie elke artikel laat verdwyn nie — presies hoe hierdie
    // branch se bladsy vantevore stukkend gegaan het.
    expect(normaliseerArtikels({ total: 355, wereld: [artikel()] })).toHaveLength(1);
  });

  it("gee 'n leë lys as die objek géén skikking-waardes het nie", () => {
    expect(normaliseerArtikels({ fout: "oeps", total: 355 })).toEqual([]);
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

describe("volgorde en duplikate", () => {
  /* Netwerk24 se 114 artikels dra net 3 verskillende publishedAt-waardes, dus
     doen 'n datum-sortering feitlik niks en bly die kategorie-volgorde staan —
     wat "wereld" bo Suid-Afrikaanse nuus sit. `rang` moet die knoop deurhak. */
  it("sorteer op rang wanneer die datums dieselfde is", () => {
    const rou = {
      wereld: [
        { id: "w1", headline: "Wereld een", sourceName: "Netwerk24", publishedAt: "2026-08-18T03:50:00.000Z" },
        { id: "w2", headline: "Wereld twee", sourceName: "Netwerk24", publishedAt: "2026-08-18T03:50:00.000Z" },
      ],
      "suid-afrika": [
        { id: "s1", headline: "SA een", sourceName: "Netwerk24", publishedAt: "2026-08-18T03:50:00.000Z" },
      ],
    };
    const [groep] = groepeerPerBron(normaliseerArtikels(rou));
    // w1 (rang 0) en s1 (rang 0) kom voor w2 (rang 1)
    expect(groep.artikels.map((a) => a.id)).toEqual(["w1", "s1", "w2"]);
  });

  it("'n nuwer datum klop steeds die rang", () => {
    const rou = {
      wereld: [{ id: "w1", headline: "Ouer", sourceName: "Netwerk24", publishedAt: "2026-08-17T06:00:00.000Z" }],
      "suid-afrika": [{ id: "s1", headline: "Nuwer", sourceName: "Netwerk24", publishedAt: "2026-08-18T06:00:00.000Z" }],
    };
    const [groep] = groepeerPerBron(normaliseerArtikels(rou));
    expect(groep.artikels[0].id).toBe("s1");
  });

  it("gooi dieselfde artikel weg as dit in twee kategorieë staan", () => {
    const rou = {
      wereld: [{ id: "x", headline: "Een storie", sourceName: "Netwerk24", publishedAt: "2026-08-18T03:50:00.000Z" }],
      internasionaal: [{ id: "x", headline: "Een storie", sourceName: "Netwerk24", publishedAt: "2026-08-18T03:50:00.000Z" }],
    };
    const [groep] = groepeerPerBron(normaliseerArtikels(rou));
    expect(groep.artikels).toHaveLength(1);
  });
});

describe("beelde", () => {
  it("dra imageUrl deur wanneer dit daar is", () => {
    const [a] = normaliseerArtikels([
      { id: "b1", headline: "Met beeld", sourceName: "News24", imageUrl: "https://x.test/f.jpg" },
    ]);
    expect(a.imageUrl).toBe("https://x.test/f.jpg");
  });

  it("gee 'n leë string wanneer daar geen beeld is nie", () => {
    // Baie stories het geen prent nie; die ry moet steeds werk.
    const [a] = normaliseerArtikels([{ id: "b2", headline: "Sonder", sourceName: "News24" }]);
    expect(a.imageUrl).toBe("");
  });
});

describe("kategorie-volgorde", () => {
  const rou = {
    // "wereld" staan EERSTE in die objek, presies soos by kremetart.
    wereld: [{ id: "w", headline: "Trump doen iets", sourceName: "Netwerk24", category: "wereld", publishedAt: "2026-08-18T03:50:00.000Z" }],
    "suid-afrika": [{ id: "s", headline: "Eskom doen iets", sourceName: "Netwerk24", category: "suid-afrika", publishedAt: "2026-08-18T03:50:00.000Z" }],
  };

  it("sit plaaslike nuus bo wêreldnuus, al kom wêreld eerste in die antwoord", () => {
    const [groep] = groepeerPerBron(normaliseerArtikels(rou));
    expect(groep.artikels.map((a) => a.id)).toEqual(["s", "w"]);
  });

  it("'n onbekende kategorie beland agter die gelyste plaaslikes", () => {
    const [groep] = groepeerPerBron(
      normaliseerArtikels({
        vreemd: [{ id: "v", headline: "Onbekend", sourceName: "Netwerk24", category: "vreemd", publishedAt: "2026-08-18T03:50:00.000Z" }],
        beeld: [{ id: "b", headline: "Plaaslik", sourceName: "Netwerk24", category: "beeld", publishedAt: "2026-08-18T03:50:00.000Z" }],
      })
    );
    expect(groep.artikels.map((a) => a.id)).toEqual(["b", "v"]);
  });
});

