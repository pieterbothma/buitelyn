import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/markets/source";
import { naamVirSimbool } from "@/lib/markets/boards";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 120;

/* Pryswaarskuwings-wagter: elke 15 min, 24/7 (kripto en die rand slaap nie).
   'n Waarskuwing vuur EEN keer — die ry word gemerk, nie geskrap nie. */

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: waarskuwings } = await sb
    .from("prys_waarskuwings")
    .select("id, user_id, simbool, naam, rigting, drempel")
    .is("afgevuur_at", null);
  if (!waarskuwings?.length) return NextResponse.json({ ok: true, aktief: 0 });

  const simbole = [...new Set(waarskuwings.map((w) => w.simbool.toUpperCase()))];
  const kwotasies = await getQuotes(simbole);
  const prys = new Map(kwotasies.map((k) => [k.simbool, k]));

  const geraak = waarskuwings.filter((w) => {
    const k = prys.get(w.simbool.toUpperCase());
    if (!k) return false;
    return w.rigting === "bo" ? k.prys >= Number(w.drempel) : k.prys <= Number(w.drempel);
  });
  if (!geraak.length) return NextResponse.json({ ok: true, aktief: waarskuwings.length, geraak: 0 });

  // Telegram-koppelinge vir lewering
  const { data: koppelinge } = await sb
    .from("telegram_koppelinge")
    .select("user_id, chat_id")
    .not("chat_id", "is", null)
    .in("user_id", [...new Set(geraak.map((w) => w.user_id))]);
  const chatVan = new Map((koppelinge ?? []).map((k) => [k.user_id, k.chat_id]));

  let gestuur = 0;
  for (const w of geraak) {
    const k = prys.get(w.simbool.toUpperCase())!;
    await sb
      .from("prys_waarskuwings")
      .update({ afgevuur_at: new Date().toISOString(), afgevuur_prys: k.prys })
      .eq("id", w.id);
    const chatId = chatVan.get(w.user_id);
    if (chatId && process.env.TELEGRAM_BOT_TOKEN) {
      const naam = w.naam ?? naamVirSimbool(w.simbool);
      const geld = k.geldeenheid === "ZAR" ? "R" : k.geldeenheid + " ";
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔔 <b>${naam}</b> is ${w.rigting === "bo" ? "bo" : "onder"} jou drempel van ${geld}${Number(w.drempel).toFixed(2)}\nNou: ${geld}${k.prys.toFixed(2)} · ±15 min vertraag\n\nbuitelyn.com/markte?blad=portefeulje`,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }).catch(() => null);
      if (res?.ok) gestuur++;
    }
  }
  return NextResponse.json({ ok: true, aktief: waarskuwings.length, geraak: geraak.length, gestuur });
}
