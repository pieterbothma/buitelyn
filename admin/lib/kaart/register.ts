/* Die styl-register: wat elke styl heet, watter vorms dit ondersteun, en
   watter velde die redigeerder moet wys.

   KLIËNT-VEILIG — hierdie lêer bevat GEEN renderkode nie. Die redigeerder bou
   sy vorm hieruit, sodat 'n nuwe styl één inskrywing kos in plaas van 'n nuwe
   handgeskrewe paneel.

   Die Record<Styl, ...> is die punt van die oefening: 'n vyfde styl breek die
   bou hier én in render.tsx totdat albei dit hanteer. */

import { verstekSpec, VORM_NAAM, type KaartSpec, type Styl, type Vorm } from "./spec";

export type Veld =
  | { soort: "teks" | "langteks"; sleutel: string; etiket: string; plekhouer?: string; maks?: number }
  | { soort: "lys"; sleutel: string; etiket: string; maksItems: number }
  | { soort: "keuse"; sleutel: string; etiket: string; opsies: { waarde: string; naam: string }[] }
  | { soort: "beeld"; sleutel: string; etiket: string }
  | { soort: "skakelaar"; sleutel: string; etiket: string };

export type StylDefinisie = {
  naam: string;
  beskrywing: string;
  vorms: Vorm[];
  velde: Veld[];
  verstek: () => KaartSpec;
};

const ALLE_VORMS: Vorm[] = ["vierkant", "portret", "storie", "landskap"];

export const STYLE: Record<Styl, StylDefinisie> = {
  "kop-beeld": {
    naam: "Kop + beeld",
    beskrywing: "'n Opskrif met 'n kort byskrif, met of sonder 'n beeld.",
    vorms: ALLE_VORMS,
    velde: [
      {
        soort: "keuse",
        sleutel: "uitleg",
        etiket: "Uitleg",
        opsies: [
          { waarde: "beeld-bo", naam: "Beeld bo" },
          { waarde: "beeld-agter", naam: "Beeld agter die teks" },
          // beeld-langs werk net waar daar wydte is; sien VORM_UITLEG hieronder.
          { waarde: "beeld-langs", naam: "Beeld langsaan" },
        ],
      },
      { soort: "teks", sleutel: "etiket", etiket: "Etiket", plekhouer: "MARKTE", maks: 40 },
      { soort: "teks", sleutel: "kop", etiket: "Opskrif", maks: 160 },
      { soort: "langteks", sleutel: "byskrif", etiket: "Byskrif", maks: 320 },
      { soort: "beeld", sleutel: "beeld", etiket: "Beeld" },
    ],
    verstek: () => verstekSpec("kop-beeld"),
  },

  "groot-getal": {
    naam: "Groot getal",
    beskrywing: "Een syfer wat die storie dra — 'n koers, 'n persentasie, 'n bedrag.",
    vorms: ALLE_VORMS,
    velde: [
      { soort: "teks", sleutel: "getal", etiket: "Getal", plekhouer: "R1,2", maks: 12 },
      { soort: "teks", sleutel: "eenheid", etiket: "Eenheid", plekhouer: "miljard", maks: 8 },
      { soort: "teks", sleutel: "etiket", etiket: "Etiket", plekhouer: "Buitelandse belegging", maks: 80 },
      { soort: "langteks", sleutel: "konteks", etiket: "Konteks", maks: 200 },
      {
        soort: "keuse",
        sleutel: "rigting",
        etiket: "Rigting",
        opsies: [
          { waarde: "op", naam: "Op ▲" },
          { waarde: "af", naam: "Af ▼" },
          { waarde: "neutraal", naam: "Neutraal" },
        ],
      },
    ],
    verstek: () => verstekSpec("groot-getal"),
  },

  aanhaling: {
    naam: "Aanhaling",
    beskrywing: "'n Uitgeligte aanhaling met die spreker se naam en rol.",
    vorms: ALLE_VORMS,
    velde: [
      { soort: "langteks", sleutel: "aanhaling", etiket: "Aanhaling", maks: 320 },
      { soort: "teks", sleutel: "naam", etiket: "Naam", maks: 60 },
      { soort: "teks", sleutel: "rol", etiket: "Rol", maks: 80 },
      { soort: "beeld", sleutel: "beeld", etiket: "Portret" },
    ],
    verstek: () => verstekSpec("aanhaling"),
  },

  meme: {
    naam: "Meme",
    beskrywing:
      "Buitelyn se eie foto met Anton-hoofletters bo en onder. Gebruik ons eie beelde — sien die lisensie-nota in die kode.",
    vorms: ALLE_VORMS,
    velde: [
      { soort: "beeld", sleutel: "beeld", etiket: "Foto" },
      { soort: "teks", sleutel: "boTeks", etiket: "Boteks", maks: 80 },
      { soort: "teks", sleutel: "onderTeks", etiket: "Onderteks", maks: 80 },
    ],
    verstek: () => verstekSpec("meme"),
  },

  lys: {
    naam: "Lys",
    beskrywing: "Drie tot ses punte — 'n opsomming wat op een kaart pas.",
    // 'n Lys van ses items pas nie in 'n 1.91:1-strook nie.
    vorms: ["vierkant", "portret", "storie"],
    velde: [
      { soort: "teks", sleutel: "kop", etiket: "Opskrif", maks: 120 },
      { soort: "skakelaar", sleutel: "genommer", etiket: "Genommer" },
      { soort: "lys", sleutel: "items", etiket: "Punte", maksItems: 6 },
    ],
    verstek: () => verstekSpec("lys"),
  },
};

/** Uitlegte wat in 'n gegewe vorm sin maak. "Beeld langsaan" het wydte nodig,
 *  so dit word weggesteek op 9:16 in plaas daarvan om iets lelik te render. */
export const VORM_UITLEG: Record<Vorm, string[]> = {
  vierkant: ["beeld-bo", "beeld-agter", "beeld-langs"],
  portret: ["beeld-bo", "beeld-agter", "beeld-langs"],
  storie: ["beeld-bo", "beeld-agter"],
  landskap: ["beeld-langs", "beeld-agter", "beeld-bo"],
};

export function stylLys(): { styl: Styl; naam: string; beskrywing: string }[] {
  return (Object.keys(STYLE) as Styl[]).map((styl) => ({
    styl,
    naam: STYLE[styl].naam,
    beskrywing: STYLE[styl].beskrywing,
  }));
}

/** Vorms wat 'n styl toelaat, met hul mensname — vir die vorm-kieser. */
export function vormsVir(styl: Styl): { vorm: Vorm; naam: string }[] {
  return STYLE[styl].vorms.map((vorm) => ({ vorm, naam: VORM_NAAM[vorm] }));
}
