import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/markets/source";
import { ALLE_SIMBOLE, naamVirSimbool } from "@/lib/markets/boards";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;

  const nou = new Date();
  const uur = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "numeric", hour12: false }).format(nou)
  );
  const weekdag = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", weekday: "long" }).format(nou);
  const tydVanDag = uur < 12 ? "die oggend" : uur < 17 ? "die middag" : "die aand";

  const kwotasies = await getQuotes(ALLE_SIMBOLE, 0);
  const feite = kwotasies
    .map(
      (k) =>
        `${naamVirSimbool(k.simbool)}: ${k.prys.toFixed(2)} ${k.geldeenheid} (${
          k.deltaPersent != null ? (k.deltaPersent >= 0 ? "+" : "") + k.deltaPersent.toFixed(2) + "%" : "?"
        })`
    )
    .join("; ");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Dit is nou ${tydVanDag} (${uur}:30) op 'n ${weekdag} in Suid-Afrika. Skryf 'n kort Afrikaanse markoorsig (±110 woorde, een paragraaf, Buitelyn se stem: helder, bietjie speels, geen clichés) oor hoe die markdag TOT DUSVER verloop — pas jou verwysings by die tyd aan (vroegoggend: wat die dag inwag; middag: die dag se verloop; ná 17:00: hoe die JSE gesluit het). Fokus op die 2-3 interessantste bewegings (rand, JSE, goud, kripto). Geen opskrif, geen advies, geen plekhouers. Skryf suiwer hedendaagse Afrikaans — NOOIT Nederlandse, Vlaamse of Duitse woorde nie (bv. 'achtbaan' is Nederlands). As jy twyfel of 'n woord regte Afrikaans is, gebruik eerder die Engelse leenwoord (bv. 'rollercoaster') of 'n gewone Afrikaanse alternatief.\n\nSyfers: ${feite}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.6 },
      }),
    }
  );
  const data = await res.json();
  const teks: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!teks) return NextResponse.json({ fout: "Gemini het niks geskryf nie" }, { status: 502 });

  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date()
  );
  const { error } = await sb
    .from("markte_oorsigte")
    .upsert({ datum, teks, opgedateer_at: new Date().toISOString() }, { onConflict: "datum" });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, datum, lengte: teks.length });
}
