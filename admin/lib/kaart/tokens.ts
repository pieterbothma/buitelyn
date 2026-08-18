/* Buitelyn se kaartpalet op EEN plek. Dieselfde hexes was voorheen letterlik
   herhaal in kaart-render.tsx, grafiek-render.tsx, globals.css en die roetes —
   'n verandering aan die huisstyl moes op vier plekke gebeur.

   Hierdie lêer is KLIËNT-VEILIG: geen JSX, geen next/og. Die redigeerder mag
   dit invoer. */

export const INK = "#1A1A1A";
export const PAPIER = "#EBEAE6";
export const OFFWHITE = "#F7F6F2";
export const ROOI = "#F03028";
export const GROEN = "#0E8345";

/** Gedempte ink vir sekondêre teks (byskrifte, voetskrif). */
export const INK_SAG = "#575652";
/** Dieselfde, met alfa — presies wat die bestaande byskrif gebruik. */
export const INK_SAG_ALFA = "#57565299";

/** Die vel waarop 'n kaart gedruk word. */
export const VELLE = {
  paper: { agtergrond: PAPIER, teks: INK },
  offwhite: { agtergrond: OFFWHITE, teks: INK },
  ink: { agtergrond: INK, teks: OFFWHITE },
  rooi: { agtergrond: ROOI, teks: OFFWHITE },
} as const;

export type Vel = keyof typeof VELLE;

const DONKER_VELLE: Vel[] = ["ink", "rooi"];

export function isDonker(vel: Vel): boolean {
  return DONKER_VELLE.includes(vel);
}

/** Sekondêre teks wat by die vel pas. Sonder dit verdwyn 'n byskrif in
 *  #57565299 heeltemal op 'n ink-vel — 'n regte leesbaarheidsfout wat eers by
 *  die eerste donker render sigbaar word. */
export function sagteTeksKleur(vel: Vel): string {
  return isDonker(vel) ? "#F7F6F2B3" : INK_SAG_ALFA;
}

/** Lyne, blokkies en bulletjies wat by die vel pas. */
export function lynKleur(vel: Vel): string {
  return isDonker(vel) ? VELLE[vel].teks : INK;
}

/** Rigting-kleure vir syfers — dieselfde logika as die grafiek-bouer s'n. */
export const RIGTING_KLEUR = { op: GROEN, af: ROOI, neutraal: INK } as const;
