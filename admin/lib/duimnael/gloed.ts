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
  /* 'n EWE deursnee, want 'n onewe boks kan nie op 'n heelgetal-rooster
     gesentreer word nie: met radius 0.42 gee round(0.42*2*1280) = 1075, en die
     middelpunt val op 320.5 — vir altyd 'n halwe pixel langs AP. Ons rond die
     radius af en verdubbel dan, so deursnee/2 is altyd 'n heelgetal. */
  const deursnee = 2 * Math.round(laag.gloed.radius * raam.w);
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
