import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

/* Dividend-herinnering: soggens, beursdae. As 'n aandeel in jou portefeulje
   se LDT oormôre is, kry jy 'n bot-boodskap — laaste kans om te koop. */

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fout: "nee" }, { status: 401 });
  }
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const dagFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" });
  const teiken = dagFmt.format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

  const { data: divs } = await sb
    .from("dividend_kalender")
    .select("kode, maatskappy, bedrag_sent, ldt, betaaldatum")
    .eq("ldt", teiken);
  if (!divs?.length) return NextResponse.json({ ok: true, rede: "geen LDT's oormôre" });

  const simbole = divs.map((d) => `${d.kode}.JO`);
  const [{ data: houdings }, { data: koppelinge }] = await Promise.all([
    sb.from("portefeuljes").select("user_id, simbool, aantal").in("simbool", simbole),
    sb.from("telegram_koppelinge").select("user_id, chat_id").not("chat_id", "is", null).eq("sens", true),
  ]);
  const chatVan = new Map((koppelinge ?? []).map((k) => [k.user_id, k.chat_id]));

  let gestuur = 0;
  const perGebruiker = new Map<string, string[]>();
  for (const h of houdings ?? []) {
    if (!chatVan.has(h.user_id)) continue;
    const d = divs.find((x) => `${x.kode}.JO` === h.simbool)!;
    const beraam = d.bedrag_sent ? ` — ±R ${((Number(d.bedrag_sent) / 100) * Number(h.aantal)).toFixed(0)} vir jou ${Number(h.aantal)} aandele` : "";
    const reel = `⭐ <b>${d.maatskappy}</b> se LDT is oormôre${beraam}${d.betaaldatum ? ` (betaal ${d.betaaldatum})` : ""}`;
    const lys = perGebruiker.get(h.user_id) ?? [];
    lys.push(reel);
    perGebruiker.set(h.user_id, lys);
  }
  for (const [userId, reels] of perGebruiker) {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatVan.get(userId),
        text: [`💰 <b>Dividend-herinnering</b>`, "", ...reels, "", "Laaste dag om te koop vir dié dividend is oormôre. buitelyn.com/markte?blad=portefeulje"].join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }).catch(() => null);
    if (res?.ok) gestuur++;
  }
  return NextResponse.json({ ok: true, ldts: divs.length, gestuur });
}
