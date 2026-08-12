import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/markets/source";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 300;

/* Daaglikse Beursliga-snapshot ná sluitingstyd (17:10 SAST, beursdae) —
   elke speler se totale waarde word gestoor en die maand-grafiek bou daaruit. */

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const [{ data: spelers }, { data: houdings }] = await Promise.all([
    sb.from("liga_spelers").select("user_id, kontant"),
    sb.from("liga_houdings").select("user_id, simbool, aantal, koopprys"),
  ]);
  if (!spelers?.length) return NextResponse.json({ ok: true, rede: "geen spelers" });

  const simbole = [...new Set((houdings ?? []).map((h) => h.simbool))];
  const kwotasies = simbole.length ? await getQuotes(simbole) : [];
  const prys = new Map(kwotasies.map((k) => [k.simbool, k.prys]));
  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  const rye = spelers.map((s) => {
    const myne = (houdings ?? []).filter((h) => h.user_id === s.user_id);
    const waarde =
      Number(s.kontant) +
      myne.reduce((tot, h) => tot + (prys.get(h.simbool) ?? Number(h.koopprys)) * Number(h.aantal), 0);
    return { datum, user_id: s.user_id, waarde };
  });
  const { error } = await sb.from("liga_snapshotte").upsert(rye, { onConflict: "datum,user_id" });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, datum, spelers: rye.length });
}
