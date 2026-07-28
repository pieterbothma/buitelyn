import { NextResponse, type NextRequest, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { beantwoordMarkteVraag } from "@/lib/markets/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Telegram-webhook vir @buitelynbot. Telegram stuur elke boodskap hierheen;
   ons antwoord uitsluitlik via die Bot API (nie die webhook-response nie)
   sodat 'n mislukte stuur nie Telegram se herprobeer-lus aktiveer nie. */

type TelegramUpdate = {
  message?: {
    chat: { id: number; first_name?: string };
    text?: string;
  };
};

function service() {
  return createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

async function stuur(chatId: number, teks: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: teks, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}

const HULP = `Ek is die Buitelyn-bot 🔴

Koppel jou buitelyn.com-rekening by <b>buitelyn.com/markte</b> (Telegram-oortjie) — dan stuur ek jou markte-oorsig klankgrepe, drie keer per beursdag, en kan jy my enigiets oor die markte vra ("wat het Naspers vandag gedoen?").

/oorsig — die jongste markte-oorsig as teks
/stop — ontkoppel jou rekening`;

/* Telegram parse_mode=HTML: ontsnap eers alles, maak dan net die agent se
   [naam](url)-skakels klikbaar. Ongeldige HTML laat sendMessage in stilte
   faal — dus streng ontsnapping voor enige merkup. */
function htmlVirTelegram(teks: string): string {
  const ontsnap = teks.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return ontsnap.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, naam: string, url: string) => `<a href="${url}">${naam}</a>`
  );
}

export async function POST(request: NextRequest) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ fout: "nee" }, { status: 401 });
  }
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const boodskap = update?.message;
  const teks = boodskap?.text?.trim() ?? "";
  if (!boodskap || !teks) return NextResponse.json({ ok: true });
  const chatId = boodskap.chat.id;
  const sb = service();

  // /start KODE (diep skakel) of 'n kaal kode geplak
  const kodeMatch = teks.match(/^\/start\s+(BL[A-Z2-9]{6})$/i) ?? teks.match(/^(BL[A-Z2-9]{6})$/i);
  if (kodeMatch) {
    const kode = kodeMatch[1].toUpperCase();
    const { data } = await sb
      .from("telegram_koppelinge")
      .select("user_id, kode_verval")
      .eq("koppel_kode", kode)
      .maybeSingle();
    if (!data || !data.kode_verval || new Date(data.kode_verval) < new Date()) {
      await stuur(chatId, "Daardie kode is ongeldig of verval. Kry 'n vars een by buitelyn.com/markte se Telegram-oortjie.");
      return NextResponse.json({ ok: true });
    }
    const { error } = await sb
      .from("telegram_koppelinge")
      .update({ chat_id: chatId, gekoppel_at: new Date().toISOString(), koppel_kode: null, kode_verval: null })
      .eq("user_id", data.user_id);
    await stuur(
      chatId,
      error
        ? "Iets het skeefgeloop met die koppeling — probeer 'n vars kode."
        : `Gekoppel, ${boodskap.chat.first_name ?? "vriend"}! 🔴\n\nJy ontvang nou die Buitelyn markte-klankgrepe hier. Stel jou uitgawes (oggend/middag/aand) by buitelyn.com/markte se Telegram-oortjie.\n\n/oorsig gee jou enige tyd die jongste teks-oorsig.`
    );
    return NextResponse.json({ ok: true });
  }

  if (/^\/stop\b/i.test(teks)) {
    await sb
      .from("telegram_koppelinge")
      .update({ chat_id: null, gekoppel_at: null, gesprek: [], gesprek_at: null })
      .eq("chat_id", chatId);
    await stuur(chatId, "Ontkoppel. Jy kan enige tyd weer koppel by buitelyn.com/markte.");
    return NextResponse.json({ ok: true });
  }

  if (/^\/oorsig\b/i.test(teks)) {
    const { data } = await sb
      .from("markte_oorsigte")
      .select("teks, opgedateer_at")
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.teks) {
      const tyd = data.opgedateer_at
        ? new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" }).format(new Date(data.opgedateer_at))
        : "";
      await stuur(chatId, `<b>Vandag op die markte</b> ${tyd ? `(bygewerk ${tyd})` : ""}\n\n${data.teks}\n\nbuitelyn.com/markte`);
    } else {
      await stuur(chatId, "Nog geen oorsig vir vandag nie — probeer weer ná 06:30.");
    }
    return NextResponse.json({ ok: true });
  }

  // Vrye teks: gekoppelde gebruikers kry die VRA BUITELYN-agent;
  // ongekoppeldes kry die hulp-teks (LLM-koste bly agter die rekening-hek).
  const { data: koppeling } = await sb
    .from("telegram_koppelinge")
    .select("user_id, gesprek, gesprek_at")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (!koppeling || teks.startsWith("/") || teks.length > 600) {
    await stuur(chatId, HULP);
    return NextResponse.json({ ok: true });
  }

  // Kort geheue vir opvolgvrae ("en Prosus?"): laaste beurte, maar net as
  // die gesprek vars is — ou konteks verwar meer as wat dit help.
  const GESPREK_VENSTER_MS = 2 * 60 * 60_000;
  const vars =
    koppeling.gesprek_at && Date.now() - new Date(koppeling.gesprek_at).getTime() < GESPREK_VENSTER_MS;
  const vorige = (vars ? ((koppeling.gesprek ?? []) as { rol: string; teks: string }[]) : []).slice(-8);
  const geskiedenis = [...vorige, { rol: "gebruiker", teks }];

  // Antwoord ná die 200 (after) — Telegram kry dadelik sy antwoord en
  // herprobeer nie die update terwyl die agent dink nie.
  after(async () => {
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }).catch(() => {});
    try {
      const antwoord = await beantwoordMarkteVraag(geskiedenis, {
        ekstraInstruksies:
          "Jy antwoord in Telegram — hou dit kort (hoogstens 5 sinne), skoon teks sonder opmaak behalwe skakels as [naam](url).",
      });
      await stuur(chatId, htmlVirTelegram(antwoord));
      const knip = (t: string) => t.slice(0, 1000);
      await sb
        .from("telegram_koppelinge")
        .update({
          gesprek: [...geskiedenis.map((b) => ({ ...b, teks: knip(b.teks) })), { rol: "bot", teks: knip(antwoord) }].slice(-8),
          gesprek_at: new Date().toISOString(),
        })
        .eq("chat_id", chatId);
    } catch {
      await stuur(chatId, "Die assistent sukkel nou — probeer weer oor 'n rukkie.");
    }
  });
  return NextResponse.json({ ok: true });
}
