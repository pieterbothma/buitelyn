/* Snit-wiskunde vir 'n beeld in 'n gleuf.

   Dit is die enigste plek waar die snit bereken word — die blaaier se
   sleep-oorlegger EN satori se render roep dieselfde funksie, so wat AP sleep
   is presies wat gerender word. Geen canvas, geen gebakte pixels: die snit is
   drie getalle op die spec.

   KLIËNT-VEILIG. */

import type { BeeldBron } from "./spec";

export type Gleuf = { w: number; h: number };
export type Plasing = { left: number; top: number; width: number; height: number };

/** Skaal waar die beeld die gleuf presies vul ("object-fit: cover"). */
function dekSkaal(bron: BeeldBron, gleuf: Gleuf): number {
  return Math.max(gleuf.w / bron.wydte, gleuf.h / bron.hoogte);
}

/** Klem die fokuspunt sodat die beeld nooit 'n gaping in die gleuf los nie.
 *  Op 'n as wat presies pas, is die fokus betekenisloos en word dit 0. */
export function klemFokus(bron: BeeldBron, gleuf: Gleuf): { x: number; y: number } {
  const s = dekSkaal(bron, gleuf) * bron.zoem;
  const oorX = bron.wydte * s - gleuf.w;
  const oorY = bron.hoogte * s - gleuf.h;
  return {
    x: oorX <= 0 ? 0 : Math.min(1, Math.max(0, bron.fokusX)),
    y: oorY <= 0 ? 0 : Math.min(1, Math.max(0, bron.fokusY)),
  };
}

/** Waar die <img> binne 'n overflow:hidden-gleuf sit.
 *
 *  Ons gebruik doelbewus NIE objectFit/objectPosition nie: "cover" kan nie
 *  zoem > 1 uitdruk nie, en absolute posisionering binne 'n overflow-houer is
 *  reeds bewese in hierdie kodebasis (grafiek-render.tsx). */
export function beeldPlasing(bron: BeeldBron, gleuf: Gleuf): Plasing {
  const s = dekSkaal(bron, gleuf) * bron.zoem;
  const width = Math.round(bron.wydte * s);
  const height = Math.round(bron.hoogte * s);
  const fokus = klemFokus(bron, gleuf);
  // `|| 0` vee negatiewe nul uit: -(0) * 0 gee -0, wat deur toetse en
  // stringifiëring lek sonder om ooit iets te beteken.
  return {
    width,
    height,
    left: Math.round(-(width - gleuf.w) * fokus.x) || 0,
    top: Math.round(-(height - gleuf.h) * fokus.y) || 0,
  };
}
