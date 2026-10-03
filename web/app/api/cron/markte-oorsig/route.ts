import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/markets/source";
import { ALLE_SIMBOLE, naamVirSimbool } from "@/lib/markets/boards";
import { cronGeweier } from "@/lib/cron-hek";
import { skryfOorsig } from "@/lib/markets/oorsig";

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

  const teks = await skryfOorsig({ tydVanDag, uur, weekdag, feite });
  if (!teks) return NextResponse.json({ fout: "Luna en Gemini het niks geskryf nie" }, { status: 502 });

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
