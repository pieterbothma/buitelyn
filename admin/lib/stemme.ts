/* Die stemme wat NIBS kan gebruik.

   Alida is die stem wat die oorsigte, die briefings en alles anders reeds
   praat; sy bly die verstek. Akker kom nuut by.

   Die ID's woon HIER en nie in die kliënt nie: 'n ElevenLabs-ID in die
   blaaier laat enigiemand met die blad oop die kwota teen enige stem
   bestee. Die blaaier stuur 'n naam; hierdie lêer maak dit 'n ID. */

export const STEM_NAME = ["alida", "akker"] as const;
export type StemNaam = (typeof STEM_NAME)[number];

const AKKER = "LG95yZDEHg6fCZdQjLqj";

export function kiesStem(naam?: string): string {
  const alida = process.env.ELEVENLABS_VOICE_ID ?? "";
  /* Onbekend of niks → Alida. 'n Onbekende naam moet nie 'n generasie laat
     val nie; die ergste geval is die verkeerde stem, wat hoorbaar is. */
  return naam === "akker" ? AKKER : alida;
}
