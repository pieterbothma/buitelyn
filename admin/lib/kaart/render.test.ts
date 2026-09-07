import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderKaart } from "./render";
import { renderKaartPng } from "../kaart-render";
import { AFMETINGS, normaliseerKaart, type Kaart } from "./spec";
import GOUE from "../__fixtures__/kaart-goud.json";

/* Uitleg-regressietoetse.
 *
 * Waarom hashes en nie 'n slim assertie nie: toe die kop-beeld-styl 'n React
 * <>-fragment as kinders gebruik het, het satori dit NIE in die ouer se
 * flex-kinders uitgevou nie — die kop en byskrif het langs mekaar beland in
 * plaas van onder mekaar. Daardie kaart het `tsc`, `eslint` ÉN `next build`
 * skoon deurgekom. Net 'n gerenderde vergelyking het dit gevang.
 *
 * As 'n toets hier faal:
 *   1. Is die verandering BEDOEL? Herbou die goue waardes met
 *      `npx vitest run lib/kaart/render.test.ts -u` se uitset — of gooi
 *      HERSKRYF_GOUD=1 en die toets skryf die nuwe hashes self weg.
 *   2. Is dit NIE bedoel nie? Render die geval en kyk daarna. Satori waarsku
 *      nooit oor uitleg nie, dit skuif net stil.
 *
 * 'n Next- of satori-opgradering sal hierdie hashes verander. Dis die punt:
 * dit dwing jou om na die prentjie te kyk voordat jy dit aanvaar. */

const DATUM = "2026-08-13";

const GEVALLE: { naam: string; kaart: unknown }[] = [
  {
    naam: "kop-beeld-kort",
    kaart: { vorm: "vierkant", spec: { styl: "kop-beeld", kop: "JSE sluit hoër", byskrif: "Goud trek die mark op." } },
  },
  {
    naam: "kop-beeld-lang-omvou",
    kaart: {
      vorm: "portret",
      spec: {
        styl: "kop-beeld",
        kop: "'n Baie lang opskrif wat oor die 40-karakter-drempel gaan en dus kleiner moet word",
        byskrif: "Toets van die enigste aanpassende reël in die hele kaart.",
      },
    },
  },
  {
    naam: "kop-beeld-afrikaans",
    kaart: {
      vorm: "portret",
      spec: {
        styl: "kop-beeld",
        kop: "Wêreld sê nee — 'n toets",
        byskrif: "ë ê ô û á · 'n reël wat met 'n afkappingsteken begin",
      },
    },
  },
  {
    naam: "groot-getal-op",
    kaart: {
      vorm: "vierkant",
      spec: { styl: "groot-getal", getal: "R1,2", eenheid: "mrd", etiket: "Buitelandse belegging", konteks: "Die hoogste kwartaal sedert 2019.", rigting: "op" },
    },
  },
  {
    naam: "groot-getal-ink-af",
    kaart: {
      vorm: "vierkant",
      vel: "ink",
      spec: { styl: "groot-getal", getal: "-3,4", eenheid: "%", etiket: "Ink-vel toets", konteks: "Omgekeerde palet.", rigting: "af" },
    },
  },
  {
    naam: "aanhaling-portret",
    kaart: {
      vorm: "portret",
      spec: { styl: "aanhaling", aanhaling: "Die rand se herstel is nie 'n oorwinning nie — dit is 'n blaaskans.", naam: "AP du Plessis", rol: "Buitelyn" },
    },
  },
  {
    naam: "lys-storie",
    kaart: {
      vorm: "storie",
      spec: { styl: "lys", kop: "Drie dinge vandag", genommer: true, items: ["Die JSE sluit op 'n rekordhoogte", "Goud bo $2 400", "Eskom hou stadium 2"] },
    },
  },
  {
    naam: "lys-ses-digtheid",
    kaart: {
      vorm: "portret",
      spec: { styl: "lys", kop: "Ses punte", genommer: false, items: ["Een", "Twee met 'n langer reël wat moet omvou", "Drie", "Vier", "Vyf", "Ses"] },
    },
  },
  {
    // Sonder beeld — die goue toetse mag NIE van die netwerk afhang nie.
    naam: "meme-teks-alleen",
    kaart: {
      vorm: "vierkant",
      merk: false,
      spec: { styl: "meme", boTeks: "As die rand vasbyt", onderTeks: "Maar Eskom sê nee" },
    },
  },
  {
    naam: "meme-diakrities",
    kaart: {
      vorm: "portret",
      merk: false,
      spec: { styl: "meme", boTeks: "Wanneer jy dink dis 'n rustige môre", onderTeks: "Ê Ô Û Á" },
    },
  },
  {
    naam: "kop-beeld-landskap",
    kaart: {
      vorm: "landskap",
      spec: { styl: "kop-beeld", etiket: "Markte", kop: "Rand hou vas", byskrif: "Handelaars wag op die Fed." },
    },
  },
];

function hash(b: Buffer) {
  return createHash("sha256").update(b).digest("hex").slice(0, 16);
}

/** PNG-kop lees: byte 16-24 dra breedte en hoogte. */
function pngAfmetings(b: Buffer) {
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const goud = GOUE as Record<string, string>;
const herskryf = process.env.HERSKRYF_GOUD === "1";
const nuweGoud: Record<string, string> = {};

describe("renderKaart — uitleg-regressie", () => {
  for (const geval of GEVALLE) {
    it(geval.naam, async () => {
      const kaart = normaliseerKaart(geval.kaart) as Kaart;
      const png = await renderKaart(kaart, { datum: DATUM });

      // Basiese gesondheid: 'n geldige PNG met die regte afmetings.
      expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(pngAfmetings(png)).toEqual(AFMETINGS[kaart.vorm]);
      // 'n Leë kaart is nooit reg nie — die kleinste egte render is ruim hierbo.
      expect(png.length).toBeGreaterThan(10_000);

      const h = hash(png);
      nuweGoud[geval.naam] = h;
      if (!herskryf) {
        expect(h, `Uitleg het verander vir "${geval.naam}". Render dit en kyk daarna.`).toBe(
          goud[geval.naam]
        );
      }
    }, 30_000);
  }

  it("renderKaartPng bly agtertoe-versoenbaar", async () => {
    // Die audiogram-pyplyn en die ou poskaart-roete hang hiervan af.
    const png = await renderKaartPng({ kop: "JSE sluit hoër", byskrif: "Goud trek die mark op." }, DATUM, false);
    expect(hash(png)).toBe(goud["kop-beeld-kort"]);
  }, 30_000);

  it("halfskaal-voorskou gee presies die helfte se afmetings", async () => {
    const kaart = normaliseerKaart({ vorm: "vierkant", spec: { styl: "kop-beeld", kop: "Skaal" } });
    const png = await renderKaart(kaart, { datum: DATUM, skaal: 0.5 });
    expect(pngAfmetings(png)).toEqual({ w: 540, h: 540 });
  }, 30_000);
});

afterAll(() => {
  if (!herskryf) return;
  writeFileSync(
    new URL("../__fixtures__/kaart-goud.json", import.meta.url),
    JSON.stringify(nuweGoud, null, 2) + "\n"
  );
});
