/* Die rooi gloed agter AP.

   Deterministies, nie KI nie. 'n Gevraagde "altyd" kan nie aan 'n model
   uitbestee word nie: 'n gradiënt is identies elke keer, kos niks, en wys
   dadelik in die voorskou terwyl AP sleep.

   KLIËNT-VEILIG. */

import type { Gleuf, LaagKas } from "./laag";
import type { Gloed, Laag } from "./spec";

/** Waar die gloed sit — dieselfde ankerpunt as die reaksie, want 'n gloed wat
 *  nie sy mens volg nie is net 'n kol op die agtergrond. */
export function gloedKas(laag: Laag, raam: Gleuf): LaagKas | null {
  if (laag.soort !== "reaksie" || !laag.gloed.aan) return null;
  const deursnee = Math.round(laag.gloed.radius * 2 * raam.w);
  return {
    left: Math.round(laag.plek.x * raam.w - deursnee / 2),
    top: Math.round(laag.plek.y * raam.h - deursnee / 2),
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
    `<rect width="100" height="100" fill="url(%23g)"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
