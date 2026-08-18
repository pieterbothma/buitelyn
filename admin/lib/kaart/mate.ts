/* Raam- en gleufafmetings — KLIËNT-VEILIG (geen JSX, geen next/og).
   Dit woon apart sodat die snit-oorlegger in die blaaier PRESIES dieselfde
   getalle gebruik as die renderaar. Toe hulle uitmekaar was, het die snitboks
   'n vaste 320x200-landskap gewys terwyl die werklike gleuf 'n sirkel of 'n
   hoë strook was — en "wat jy sleep is wat jy kry" was toe 'n leuen. */

import { AFMETINGS, type Kaart, type Vorm } from "./spec";

/** Raam-afmetings per vorm.
 *
 *  vierkant en portret dra PRESIES die getalle van die oorspronklike
 *  kaart-render.tsx, sodat die herstrukturering geen sigbare verandering maak
 *  nie — die outomatiese poskaarte en die audiogram deel hierdie kode.
 *
 *  Storie kry 'n groot bo- en onder-marge: Instagram lê sy eie UI oor die
 *  boonste ~14% en onderste ~20% van 'n 9:16-skerm, so 'n voetskrif by y=1880
 *  is eenvoudig onleesbaar. Dit is 'n vereiste, nie afronding nie. */
export type RaamMate = {
  buiteX: number;
  buiteBo: number;
  buiteOnder: number;
  binne: number;
  rand: number;
  merk: number;
  kol: number;
  voet: number;
  voetLyn: number;
  voetPad: number;
  gaping: number;
};

export function raamMate(vorm: Vorm): RaamMate {
  switch (vorm) {
    case "storie":
      return {
        buiteX: 64, buiteBo: 220, buiteOnder: 300, binne: 56, rand: 6,
        merk: 46, kol: 38, voet: 28, voetLyn: 3, voetPad: 24, gaping: 32,
      };
    case "landskap":
      return {
        buiteX: 44, buiteBo: 40, buiteOnder: 40, binne: 36, rand: 5,
        merk: 30, kol: 24, voet: 20, voetLyn: 2, voetPad: 16, gaping: 18,
      };
    default: // vierkant + portret — onaangeraak
      return {
        buiteX: 64, buiteBo: 64, buiteOnder: 64, binne: 56, rand: 6,
        merk: 42, kol: 36, voet: 28, voetLyn: 3, voetPad: 24, gaping: 28,
      };
  }
}

/** Tipografie-skaal per vorm. vierkant/portret dra weer die oorspronklike
 *  getalle (88/72 vir die kop, 40 vir die byskrif) sodat niks skuif nie. */
export type Tipo = {
  kopGroot: number;
  kopKlein: number;
  byskrif: number;
  etiket: number;
  item: number;
  getal: number;
  aanhaling: number;
};

export function tipo(vorm: Vorm): Tipo {
  switch (vorm) {
    case "landskap":
      return { kopGroot: 62, kopKlein: 50, byskrif: 26, etiket: 18, item: 28, getal: 150, aanhaling: 40 };
    case "storie":
      return { kopGroot: 96, kopKlein: 78, byskrif: 42, etiket: 26, item: 46, getal: 260, aanhaling: 68 };
    default:
      return { kopGroot: 88, kopKlein: 72, byskrif: 40, etiket: 24, item: 40, getal: 220, aanhaling: 60 };
  }
}


/** Die inhoudsband: die ruimte tussen die woordmerk-ry en die voetskrif-ry.
 *  Die kop-ry en voet-ry vat hoogte wat satori eers by uitleg oplos en nooit
 *  terugrapporteer nie — word hulle nie afgetrek nie, loop 'n beeld onder die
 *  voetskrif in. */
export function inhoudsVlak(kaart: Kaart): { w: number; h: number; gaping: number } {
  const m = raamMate(kaart.vorm);
  const { w, h } = AFMETINGS[kaart.vorm];
  if (!kaart.merk) return { w, h, gaping: m.gaping };

  const kopH = Math.max(Math.round(m.merk * 1.2), m.kol);
  const voetH = m.voetLyn + m.voetPad + Math.round(m.voet * 1.2);
  return {
    w: w - m.buiteX * 2 - m.rand * 2 - m.binne * 2,
    h: h - m.buiteBo - m.buiteOnder - m.rand * 2 - m.binne * 2 - kopH - voetH,
    gaping: m.gaping,
  };
}

/** Die werklike gleuf waarin 'n styl se BEELD beland, in kaart-pixels.
 *  Die blaaier se snit-oorlegger en die renderaar roep albei hierdie een —
 *  dit is wat "wat jy sleep is wat jy kry" waar maak.
 *  `rond` beteken die beeld word as 'n sirkel gesny (die aanhaling se portret). */
export function gleufVir(kaart: Kaart): { w: number; h: number; rond: boolean } {
  const v = inhoudsVlak(kaart);
  const t = tipo(kaart.vorm);

  switch (kaart.spec.styl) {
    case "aanhaling": {
      const d = Math.round(t.byskrif * 2);
      return { w: d, h: d, rond: true };
    }
    case "meme":
      return { w: v.w, h: v.h, rond: false };
    case "kop-beeld":
      if (kaart.spec.uitleg === "beeld-agter") return { w: v.w, h: v.h, rond: false };
      if (kaart.spec.uitleg === "beeld-langs")
        return { w: Math.round(v.w * 0.42), h: v.h - v.gaping, rond: false };
      return { w: v.w, h: Math.round(v.h * 0.5), rond: false };
    default:
      return { w: v.w, h: v.h, rond: false };
  }
}
