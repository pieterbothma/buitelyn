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
- Verwyder alles wat nie hoorbaar sin maak nie: URL's, markdown-tekens (#, *, _, >), emoji's, voetnotas, "teken in"-oproepe, tickers tussen hakies soos "(JSE:NPN ▲ 1,2%)".
- Verwyder Substack-kopmetadata wat saamgekopieer word: die skrywer se naam as losstaande reël (bv. "André-Pierre du Plessis"), datumreëls, leestyd-aanduiders, "Share"/"Comment"/"Subscribe"-knoppieteks, en dubbele titel/onderskrif-reëls — die voorlesing begin by die eerste regte sin (die "Oor die volgende..."-opening mag bly, dis deel van die stem).
- Verwyder die kursiewe eenreël-byskrifte wat direk onder storie-opskrifte staan (foto-onderskrif-grappies soos "*As jy dink jou Takealot-mandjie is vol, kyk net hier.*") — hulle hoort by beelde, nie by voorlesing nie. Dieselfde vir enige "kyk hier"/"sien hieronder"-verwysings na iets visueel.
- Syfers en simbole in mensetaal: "R1,5 miljard" word "een komma vyf miljard rand"; "%" word "persent"; "$" word "dollar"; datums voluit.
- Tickersimbole word maatskappyname; los vreemde afkortings uit of skryf voluit.
- Skryf AFKORTINGS voluit soos dit gesê word: "asb" word "asseblief", "bv." word "byvoorbeeld", "d.w.s." word "dit wil sê", "i.p.v." word "in plaas van", "t.o.v." word "ten opsigte van", "o.a." word "onder andere", "ens." word "ensovoorts", "mnr." word "meneer", "me." word "mevrou", "nr." word "nommer" — en enige ander afkorting net so.
- Maak dit 'n PERFORMANCE, nie 'n voorlesing nie: strooi 6-10 oudio-etikette uit hierdie palet op natuurlike plekke in — [energetic] vir die opening en opgewonde nuus, [announcing] vir 'n nuwe storie se begin, [thoughtful] vir ontleding, [serious] vir slegte nuus, [amused] vir die grappies, [optimistic] vir die afsluiting, hoogstens een [sighs] op 'n af-noot. Die etikette staan op hul eie voor die sin wat die toon kry. Wissel die ritme: kort sinne ná lang sinne.
- Behou die skrywer se stem, volgorde en humor — dis dieselfde teks, net gereed vir die oor. Moenie opsom of inkort nie.
- Voeg niks anders by nie. Antwoord NET met die verwerkte teks.

Teks:
${teks.slice(0, 30_000)}`
  ).then((uit) =>
    uit ? UITSPRAAK.reduce((t, [patroon, se]) => t.replace(patroon, se), uit) : uit
  );
}
