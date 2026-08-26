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
    const fontSize = Math.round(grootte * raam.w);
    const top = Math.round(y * raam.h);
    switch (laag.belyn) {
      case "links": {
        const left = Math.round(x * raam.w);
        return { left, top, width: raam.w - left, fontSize };
      }
      case "regs": {
        const regterrand = Math.round(x * raam.w);
        return { left: 0, top, width: regterrand, fontSize };
      }
      case "middel": {
        // Simmetries om x, sodat die blok altyd binne die raam bly.
        const half = Math.round(Math.min(x, 1 - x) * raam.w);
        return { left: Math.round(x * raam.w) - half, top, width: half * 2, fontSize };
      }
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
