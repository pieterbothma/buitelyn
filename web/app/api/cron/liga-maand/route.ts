import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/markets/source";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 300;

/* Maand-afsluiting: vroegoggend op die 1ste (pryse = vorige maand se slot).
   Skryf die maand se uitslae na liga_uitslae en begin almal weer op R100k. */

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  const [{ data: spelers }, { data: houdings }] = await Promise.all([
    sb.from("liga_spelers").select("user_id, nommer, naam, kontant"),
    sb.from("liga_houdings").select("user_id, simbool, aantal, koopprys"),
  ]);
  if (!spelers?.length) return NextResponse.json({ ok: true, rede: "geen spelers" });

  const simbole = [...new Set((houdings ?? []).map((h) => h.simbool))];
  const kwotasies = simbole.length ? await getQuotes(simbole) : [];
  const prys = new Map(kwotasies.map((k) => [k.simbool, k.prys]));

  // Die maand wat sopas geëindig het (ons loop op die 1ste, SAST)
  const gister = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const maand = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit" })
    .format(gister)
    .slice(0, 7);

  const uitslae = spelers
    .map((s) => {
      const myne = (houdings ?? []).filter((h) => h.user_id === s.user_id);
      const waarde =
        Number(s.kontant) +
        myne.reduce((tot, h) => tot + (prys.get(h.simbool) ?? Number(h.koopprys)) * Number(h.aantal), 0);
      return { user_id: s.user_id, naam: s.naam, nommer: s.nommer, slotwaarde: waarde, opbrengs_persent: ((waarde - 100000) / 100000) * 100 };
    })
    .sort((a, b) => b.slotwaarde - a.slotwaarde)
    .map((u, i) => ({ ...u, maand, posisie: i + 1 }));

  const { error } = await sb.from("liga_uitslae").upsert(uitslae, { onConflict: "maand,user_id" });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Nuwe rondte: skoon houdings, vars R100k
  await sb.from("liga_houdings").delete().neq("simbool", "");
  await sb.from("liga_spelers").update({ kontant: 100000 }).neq("naam", "");

  // Wenner-aankondiging via die bot (aan almal met skuiwers óf portefeulje aan — dis nuus)
  const wenner = uitslae[0];
  if (process.env.TELEGRAM_BOT_TOKEN && wenner) {
    const { data: intekenare } = await sb
      .from("telegram_koppelinge")
      .select("chat_id")
      .not("chat_id", "is", null);
    const maandNaam = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", month: "long" }).format(gister);
    for (const g of intekenare ?? []) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: g.chat_id,
          text: `🏆 <b>Buitelyn Beursliga — ${maandNaam} se wenner</b>\n\n#${String(wenner.nommer).padStart(2, "0")} ${wenner.naam} met ${wenner.opbrengs_persent >= 0 ? "+" : ""}${wenner.opbrengs_persent.toFixed(2).replace(".", ",")}%!\n\nNuwe rondte het begin — almal weer op R100 000: buitelyn.com/markte?blad=liga`,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, maand, spelers: uitslae.length });
}
