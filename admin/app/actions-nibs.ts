"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { skryfAfrikaans } from "@/lib/gemini";

/** Vertaal geplakte teks na Afrikaans vir NIBS. Die verwerk-stap (etikette,
 *  syfers in mensetaal) is 'n APARTE knoppie — hierdie een vertaal net, sodat
 *  'n mens die vertaling kan nagaan voordat dit vir die oor gemasseer word. */
export async function vertaalNaAfrikaans(teks: string): Promise<string | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !teks.trim()) return null;

  return skryfAfrikaans(
    `Vertaal hierdie teks na Afrikaans. Reëls:
- Suiwer, hedendaagse Suid-Afrikaanse Afrikaans soos 'n mens dit werklik praat.
- NOOIT Nederlandse, Vlaamse of Duitse woorde nie. As jy twyfel of 'n woord regte Afrikaans is, gebruik eerder die gewone Engelse leenwoord of 'n eenvoudiger Afrikaanse alternatief.
- Los NOOIT 'n Engelse vakterm kaal in 'n Afrikaanse sin nie — skryf in gewone Afrikaans wat bedoel word, al moet die sin heeltemal oor.
- Name, plekname, maatskappyname en syfers bly presies soos hulle is.
- Vertaal ALLES; moenie opsom, inkort of kommentaar lewer nie.
- Behou die paragraaf-indeling.
- Toets elke sin hardop: as 'n Afrikaanssprekende dit nie so sou sê nie, skryf dit oor.

Antwoord met NET die vertaling.

${teks}`
  );
}
