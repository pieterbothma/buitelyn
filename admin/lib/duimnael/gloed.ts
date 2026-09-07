/* Die rooi gloed agter AP.

   Deterministies, nie KI nie. 'n Gevraagde "altyd" kan nie aan 'n model
   uitbestee word nie: 'n gradiënt is identies elke keer, kos niks, en wys
   dadelik in die voorskou terwyl AP sleep.

   KLIËNT-VEILIG. */

import type { Gleuf, LaagKas } from "./laag";
import { laagKas } from "./laag";
import type { Gloed, Laag } from "./spec";

/** Waar die gloed sit — dieselfde ankerpunt as die reaksie, want 'n gloed wat
 *  nie sy mens volg nie is net 'n kol op die agtergrond. */
export function gloedKas(laag: Laag, raam: Gleuf): LaagKas | null {
  if (laag.soort !== "reaksie" || !laag.gloed.aan) return null;
  /* Ons vra laagKas waar die reaksie is, eerder as om die anker weer self uit
     te werk. Dieselfde som op twee plekke dryf uiteindelik uiteen, en dan volg
     die gloed nie meer sy mens nie. */
  const kas = laagKas(laag, raam);
  const middelX = kas.left + kas.width / 2;
  const middelY = kas.top + kas.height! / 2;
  const deursnee = 2 * Math.round(laag.gloed.radius * raam.w);
  return {
    left: Math.round(middelX - deursnee / 2),
    top: Math.round(middelY - deursnee / 2),
    width: deursnee,
    height: deursnee,
  };
}

/** 'n data:-SVG radiale gradiënt. Dit is die een plek waar 'n data:-URL reg is:
 *  'n paar honderd grepe gegenereerde opmaak, nooit 'n ingebedde foto nie, en
 *  dit raak nooit die spec nie. */
export function gloedSvgUrl(gloed: Gloed): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${gloed.kleur}" stop-opacity="${gloed.sterkte}"/>` +
    `<stop offset="55%" stop-color="${gloed.kleur}" stop-opacity="${(gloed.sterkte * 0.35).toFixed(3)}"/>` +
    `<stop offset="100%" stop-color="${gloed.kleur}" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<rect width="100" height="100" fill="url(#g)"/>` +
    `</svg>`;
  /* Let wel: die `#` word LETTERLIK geskryf. encodeURIComponent ontsnap dit een
     keer na %23, wat presies een keer terug dekodeer na `#`. Skryf ons self %23,
     word dit %2523 en die gradiënt-verwysing hang in die lug — die gloed render
     dan glad nie, stilweg. */
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
