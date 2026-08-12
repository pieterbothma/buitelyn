import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes, type Kwotasie } from "@/lib/markets/source";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 300;

/* Aand-portefeulje-opsomming via @buitelynbot — cron 17:00 UTC (19:00 SAST)
   Ma–Vr. Deterministiese syfers (geen LLM): totale waarde in rand, vandag se
   beweging, wins/verlies sedert aankoop, en 'n reël per houding. */

type Houding = { simbool: string; naam: string | null; aantal: number; koopprys: number; geldeenheid: string };

const R = new Intl.NumberFormat("af-ZA", { maximumFractionDigits: 0 });
const R2 = new Intl.NumberFormat("af-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rand(n: number): string {
  return `R ${(n >= 10_000 ? R : R2).format(n)}`;
}

function teken(n: number): string {
  return n >= 0 ? "▲ +" : "▼ −";
}

/** Skakel 'n bedrag in 'n gegewe geldeenheid om na rand met die FX-kaart. */
function naRand(bedrag: number, geldeenheid: string, fx: Map<string, number>): number | null {
  if (geldeenheid === "ZAR" || geldeenheid === "ZAc") return geldeenheid === "ZAc" ? bedrag / 100 : bedrag;
  const koers =
    geldeenheid === "USD"
      ? fx.get("ZAR=X")
      : geldeenheid === "EUR"
        ? fx.get("EURZAR=X")
        : geldeenheid === "GBP"
          ? fx.get("GBPZAR=X")
          : geldeenheid === "HKD"
            ? (fx.get("ZAR=X") ?? 0) / (fx.get("HKD=X") ?? 1) || null
            : null;
  return koers ? bedrag * koers : null;
}

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ fout: "geen bot-token" }, { status: 500 });

  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: koppelinge } = await sb
    .from("telegram_koppelinge")
    .select("user_id, chat_id")
    .not("chat_id", "is", null)
    .eq("portefeulje", true);
  if (!koppelinge?.length) return NextResponse.json({ ok: true, gestuur: 0, rede: "geen intekenare" });

  const [{ data: houdings }, { data: ligaSpelers }, { data: ligaHoudings }] = await Promise.all([
    sb
      .from("portefeuljes")
      .select("user_id, simbool, naam, aantal, koopprys, geldeenheid")
      .in("user_id", koppelinge.map((k) => k.user_id)),
    sb.from("liga_spelers").select("user_id, nommer, kontant"),
    sb.from("liga_houdings").select("user_id, simbool, aantal, koopprys"),
  ]);
  if (!houdings?.length) return NextResponse.json({ ok: true, gestuur: 0, rede: "geen houdings" });

  const perGebruiker = new Map<string, Houding[]>();
  for (const h of houdings) {
    const lys = perGebruiker.get(h.user_id) ?? [];
    lys.push({ ...h, geldeenheid: h.geldeenheid ?? "ZAR" });
    perGebruiker.set(h.user_id, lys);
  }

  // Een kwotasie-haal vir alle simbole + FX-pare (Beursliga s'n ry saam)
  const simbole = [
    ...new Set([
      ...houdings.map((h) => h.simbool.toUpperCase()),
      ...(ligaHoudings ?? []).map((h) => h.simbool.toUpperCase()),
    ]),
  ];
  const fxPare = ["ZAR=X", "EURZAR=X", "GBPZAR=X", "HKD=X"];
  const kwotasies = await getQuotes([...simbole, ...fxPare]);
  const kaart = new Map<string, Kwotasie>(kwotasies.map((k) => [k.simbool, k]));
  const fx = new Map<string, number>(fxPare.map((p) => [p, kaart.get(p)?.prys ?? 0]).filter(([, v]) => v) as [string, number][]);

  const datumWoorde = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  let gestuur = 0;
  let misluk = 0;
  for (const k of koppelinge) {
    const lys = perGebruiker.get(k.user_id);
    if (!lys?.length) continue;

    let totaal = 0;
    let dagDelta = 0;
    let kosprys = 0;
    const reels: string[] = [];
    const onbekend: string[] = [];
    for (const h of lys) {
      const kw = kaart.get(h.simbool.toUpperCase());
      if (!kw) {
        onbekend.push(h.simbool);
        continue;
      }
      // kwotasie-prys → rand (kwotasie se eie geldeenheid), koopprys → rand (houding se geldeenheid)
      const prysRand = naRand(kw.prys, kw.geldeenheid, fx);
      const koopRand = naRand(h.koopprys, h.geldeenheid, fx);
      if (prysRand == null) {
        onbekend.push(h.simbool);
        continue;
      }
      const waarde = prysRand * h.aantal;
      totaal += waarde;
      if (kw.deltaPersent != null) dagDelta += waarde - waarde / (1 + kw.deltaPersent / 100);
      if (koopRand != null) kosprys += koopRand * h.aantal;
      const naam = h.naam ?? h.simbool.replace(".JO", "");
      const d = kw.deltaPersent;
      reels.push(
        `${naam} × ${R.format(h.aantal)}: ${rand(waarde)}${d != null ? ` (${teken(d)}${Math.abs(d).toFixed(2).replace(".", ",")}% vandag)` : ""}`
      );
    }
    if (!reels.length) continue;

    const dagPersent = totaal - dagDelta > 0 ? (dagDelta / (totaal - dagDelta)) * 100 : 0;
    const wv = kosprys > 0 ? totaal - kosprys : null;
    const wvPersent = kosprys > 0 ? ((totaal - kosprys) / kosprys) * 100 : null;

    const boodskap = [
      `🔴 <b>Jou portefeulje vanaand</b> — ${datumWoorde}`,
      "",
      `Totale waarde: <b>${rand(totaal)}</b>`,
      `Vandag: ${teken(dagDelta)}${rand(Math.abs(dagDelta))} (${Math.abs(dagPersent).toFixed(2).replace(".", ",")}%)`,
      wv != null && wvPersent != null
        ? `Sedert aankoop: ${teken(wv)}${rand(Math.abs(wv))} (${Math.abs(wvPersent).toFixed(1).replace(".", ",")}%)`
        : null,
      "",
      ...reels,
      onbekend.length ? `\nGeen kwotasie vir: ${onbekend.join(", ")}` : null,
      ...((): string[] => {
        const sp = (ligaSpelers ?? []).find((l) => l.user_id === k.user_id);
        if (!sp) return [];
        const waardes = (ligaSpelers ?? []).map((l) => {
          const myne = (ligaHoudings ?? []).filter((h) => h.user_id === l.user_id);
          return {
            user_id: l.user_id,
            waarde:
              Number(l.kontant) +
              myne.reduce((t, h) => t + (kaart.get(h.simbool.toUpperCase())?.prys ?? Number(h.koopprys)) * Number(h.aantal), 0),
          };
        });
        waardes.sort((a, b) => b.waarde - a.waarde);
        const myWaarde = waardes.find((w) => w.user_id === k.user_id)!;
        const plek = waardes.indexOf(myWaarde) + 1;
        const opbrengs = ((myWaarde.waarde - 100000) / 100000) * 100;
        return [
          "",
          `🏆 Beursliga #${String(sp.nommer).padStart(2, "0")}: ${rand(myWaarde.waarde)} (${opbrengs >= 0 ? "+" : ""}${opbrengs.toFixed(2).replace(".", ",")}%) · plek ${plek} van ${waardes.length}`,
        ];
      })(),
      "",
      "Volle terminal: buitelyn.com/markte · data ±15 min vertraag",
    ]
      .filter((r): r is string => r != null)
      .join("\n");

    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: k.chat_id, text: boodskap, parse_mode: "HTML", disable_web_page_preview: true }),
    }).catch(() => null);
    res?.ok ? gestuur++ : misluk++;
  }

  return NextResponse.json({ ok: true, gestuur, misluk });
}
