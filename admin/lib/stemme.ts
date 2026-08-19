/* Die stemme wat NIBS kan gebruik.

   Die ID's woon HIER en nie in die kliënt nie: 'n ElevenLabs-ID in die
   blaaier laat enigiemand met die blad oop die kwota teen enige stem bestee.
   Die blaaier stuur 'n naam; hierdie lêer maak dit 'n ID.

   Om 'n stem by te voeg is EEN reël in stemme() — die kieser op die blad lees
   sy opsies hieruit, dus is daar niks anders om by te werk nie. */

/* Waarom 'n funksie en nie 'n konstante nie: Alida se ID kom uit die omgewing,
   en 'n `const X = process.env.Y` op module-vlak lees die waarde die oomblik
   wanneer die module INGEVOER word. Is die omgewing op daardie oomblik nog nie
   gestel nie, vries die leë string vas en elke latere oproep kry "". Binne die
   funksie word dit by elke oproep gelees. */
function stemme(): Record<string, string> {
  return {
    Alida: process.env.ELEVENLABS_VOICE_ID ?? "",
    Akker: "LG95yZDEHg6fCZdQjLqj",
  };
}

/** Die name wat die kieser wys. Slegs name — nooit ID's — gaan kliënt toe.
 *  Die name hang nie van die omgewing af nie, dus is een keer lees veilig. */
export const STEM_NAME = Object.keys(stemme());

/** Naam → ID. Onbekend of niks → Alida.
 *
 *  Die terugval is opsetlik stil: die drie ouer oproepers (oorsig-studio,
 *  audio-studio, konsep-studio) stuur glad geen stem nie en moet aanhou werk,
 *  en 'n onbekende naam behoort 'n hoorbaar verkeerde stem te gee eerder as 'n
 *  mislukte generasie. */
export function kiesStem(naam?: string): string {
  const kaart = stemme();
  return (naam ? kaart[naam] : undefined) ?? kaart.Alida;
}
