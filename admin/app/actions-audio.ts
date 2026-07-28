"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { skryfAfrikaans } from "@/lib/gemini";

/* Uitspraak-respellings sodat die stem dit reg sê — sigbaar in die
   verwerkte teks sodat AP dit kan sien/redigeer (sinkroniseer met die
   markte-audio-route se UITSPRAAK-lys). */
const UITSPRAAK: [RegExp, string][] = [
  [/\bru[- ]?olie\b/gi, "rie-olie"],
];

/** Maak geplakte teks skoon vir voorlesing: simbole, skakels, markdown en
 *  ander nie-hoorbare rommel uit; syfers in mensetaal. */
export async function verwerkTeksVirAudio(teks: string): Promise<string | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !teks.trim()) return null;

  return skryfAfrikaans(
    `Verwerk hierdie teks sodat 'n stem dit natuurlik kan VOORLEES. Reëls:
- Verwyder alles wat nie hoorbaar sin maak nie: URL's, markdown-tekens (#, *, _, >), emoji's, voetnotas, beeld-byskrifte, "teken in"-oproepe, tickers tussen hakies soos "(JSE:NPN ▲ 1,2%)".
- Syfers en simbole in mensetaal: "R1,5 miljard" word "een komma vyf miljard rand"; "%" word "persent"; "$" word "dollar"; datums voluit.
- Tickersimbole word maatskappyname; los vreemde afkortings uit of skryf voluit.
- Behou die skrywer se stem, volgorde en humor — dis dieselfde teks, net gereed vir die oor. Moenie opsom of inkort nie.
- Voeg niks by nie. Antwoord NET met die verwerkte teks.

Teks:
${teks.slice(0, 30_000)}`
  ).then((uit) =>
    uit ? UITSPRAAK.reduce((t, [patroon, se]) => t.replace(patroon, se), uit) : uit
  );
}
