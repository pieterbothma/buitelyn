/* Die meetkunde vir 'n laag in die raam.

   Dit is die ENIGSTE plek waar 'n laag se posisie bereken word — die blaaier
   se sleep-oorlegger EN satori se render roep hierdie funksie, so wat AP sleep
   is presies wat gerender word. Geen canvas, geen gebakte pixels.

   KLIËNT-VEILIG. */

import type { Laag } from "./spec";

export type Gleuf = { w: number; h: number };

export type LaagKas = {
  left: number;
  top: number;
  width: number;
  /** Net vir reaksie en logo — teks se hoogte volg uit die omvou. */
  height?: number;
  /** Net vir teks. */
  fontSize?: number;
};

export function laagKas(laag: Laag, raam: Gleuf): LaagKas {
  const { x, y, grootte } = laag.plek;

  if (laag.soort === "teks") {
    /* Teks anker BO, nie in die middel nie: sy hoogte hang van die omvou af,
       wat die blaaier en satori nie identies oplos nie. Anker bo en die
       ankerpunt bly presies waar AP dit gelos het. */
    /* Krimp die font sodat die LANGSTE WOORD in die blok pas.

       'n Reël kan tussen woorde omvou, maar binne 'n woord is daar geen breek
       nie: is "AANDELEHOUERS" wyer as die blok, loop dit oor en word stil
       afgesny — jy sien "AANDELEHOUE". Afrikaanse saamgestelde woorde tref dit
       gereeld, en 'n smal blok maak dit erger.

       0.62 is 'n gemete benadering van League Spartan 700 se gemiddelde
       hoofletter-wydte as breukdeel van die fontgrootte. Dit hoef nie presies
       te wees nie: 'n bietjie te klein is onsigbaar, 'n afgesnyde woord nie. */
    const gevra = Math.round(grootte * raam.w);
    const blokBreedte = Math.round(laag.breedte * raam.w);
    const langste = laag.teks.split(/\s+/).reduce((n, w) => Math.max(n, w.length), 1);
    const pas = Math.floor(blokBreedte / (langste * 0.62));
    const fontSize = Math.max(8, Math.min(gevra, pas));
    const top = Math.round(y * raam.h);
    /* Die blok se breedte kom van die laag af, nie van die raamrand nie. Dit is
       wat bepaal waar 'n opskrif omvou — sonder dit loop elke reël tot by die
       kant en jy kan nie kies waar dit breek nie. */
    const width = blokBreedte;
    const anker = Math.round(x * raam.w);
    switch (laag.belyn) {
      case "links":
        return { left: anker, top, width, fontSize };
      case "regs":
        return { left: anker - width, top, width, fontSize };
      case "middel":
        return { left: Math.round(anker - width / 2), top, width, fontSize };
    }
  }

  // reaksie en logo: die hoogte is bekend, dus anker ons in die middel.
  const width = Math.round(grootte * raam.w);
  const height = laag.soort === "logo" ? width : Math.round((width * laag.hoogte) / laag.wydte);
  return {
    left: Math.round(x * raam.w - width / 2),
    top: Math.round(y * raam.h - height / 2),
    width,
    height,
  };
}
