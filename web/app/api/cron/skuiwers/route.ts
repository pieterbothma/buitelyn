import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/markets/source";
import { JSE_UITGEBREID, bewegersNaam } from "@/lib/markets/boards";
import { beantwoordMarkteVraag } from "@/lib/markets/agent";

export const maxDuration = 300;

/* "Hoekom beweeg dit?" — uurliks gedurende JSE-ure. Vind ±3%-skuiwers in die
   uitgebreide universum, laat die markte-agent EEN gegronde Afrikaanse nota
   per aandeel per dag skryf (gekas in skuiwer_notas), en stoot nuwe notas
   via @buitelynbot na almal met die skuiwers-skakelaar aan. */

const DREMPEL = 3; // persent
const MAKS_NOTAS_PER_LOPIE = 6;

function htmlOntsnap(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function skakelsNaHtml(t: string): string {
  return htmlOntsnap(t).replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, naam: string, url: string) => `<a href="${url}">${naam}</a>`
  );
}

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fout: "nee" }, { status: 401 });
  }
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  // 1. Skuiwers bo die drempel
  const kwotasies = await getQuotes(JSE_UITGEBREID.map((i) => i.simbool));
  const skuiwers = kwotasies
    .filter((k) => k.deltaPersent != null && Math.abs(k.deltaPersent) >= DREMPEL)
    .sort((a, b) => Math.abs(b.deltaPersent!) - Math.abs(a.deltaPersent!));
  if (!skuiwers.length) return NextResponse.json({ ok: true, notas: 0, rede: "geen skuiwers" });

  // 2. Net dié sonder 'n nota vir vandag
  const { data: bestaande } = await sb.from("skuiwer_notas").select("simbool").eq("datum", datum);
  const klaar = new Set((bestaande ?? []).map((r) => r.simbool));
  const nuwes = skuiwers.filter((k) => !klaar.has(k.simbool)).slice(0, MAKS_NOTAS_PER_LOPIE);
  if (!nuwes.length) return NextResponse.json({ ok: true, notas: 0, rede: "alles reeds genoteer" });

  // 3. Agent skryf een gegronde nota per skuiwer
  const geskryf: { simbool: string; naam: string; delta: number; nota: string }[] = [];
  for (const k of nuwes) {
    const naam = bewegersNaam(k.simbool);
    const rigting = k.deltaPersent! >= 0 ? "gestyg" : "gedaal";
    try {
      const nota = await beantwoordMarkteVraag(
        [
          {
            rol: "gebruiker",
            teks: `${naam} (${k.simbool}) het vandag ${Math.abs(k.deltaPersent!).toFixed(1)}% ${rigting} op die JSE. Hoekom?`,
          },
        ],
        {
          ekstraInstruksies:
            "Skryf EEN kort nota van hoogstens 3 sinne: wat het gebeur en hoekom, gegrond op kry_nuus en web-soektog. As jy geen duidelike maatskappy-spesifieke rede kry nie, sê eerlik dis waarskynlik 'n breër mark- of sektorbeweging — moenie 'n rede versin nie. Skoon teks, hoogstens een skakel as [bron](url). Moenie die persentasie herhaal nie — dit staan reeds by die naam.",
        }
      );
      geskryf.push({ simbool: k.simbool, naam, delta: k.deltaPersent!, nota });
    } catch {
      /* volgende lopie probeer weer — geen ry gestoor nie */
    }
  }
  if (geskryf.length) {
    await sb.from("skuiwer_notas").upsert(
      geskryf.map((n) => ({ datum, simbool: n.simbool, delta_persent: n.delta, nota: n.nota })),
      { onConflict: "datum,simbool" }
    );
  }
  if (!geskryf.length) return NextResponse.json({ ok: true, notas: 0, rede: "agent-foute" });

  // 4. Stoot nuwe notas na skuiwers-intekenare; merk eie aandele
  let gestuur = 0;
  let misluk = 0;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const { data: intekenare } = await sb
      .from("telegram_koppelinge")
      .select("user_id, chat_id")
      .not("chat_id", "is", null)
      .eq("skuiwers", true);
    if (intekenare?.length) {
      const simbole = geskryf.map((n) => n.simbool);
      const [{ data: houdings }, { data: dop }] = await Promise.all([
        sb.from("portefeuljes").select("user_id, simbool").in("simbool", simbole),
        sb.from("dophou").select("user_id, simbool").in("simbool", simbole),
      ]);
      const eie = new Set([...(houdings ?? []), ...(dop ?? [])].map((r) => `${r.user_id}:${r.simbool}`));

      for (const g of intekenare) {
        const reels = geskryf.map((n) => {
          const merk = eie.has(`${g.user_id}:${n.simbool}`) ? " ⭐" : "";
          const pyl = n.delta >= 0 ? "▲ +" : "▼ −";
          return `<b>${htmlOntsnap(n.naam)}</b> ${pyl}${Math.abs(n.delta).toFixed(2).replace(".", ",")}%${merk}\n${skakelsNaHtml(n.nota)}`;
        });
        const boodskap = [`🔴 <b>Groot skuiwers op die JSE</b>`, "", reels.join("\n\n"), "", "buitelyn.com/markte?blad=bewegers · ±15 min vertraag"].join("\n");
        const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: g.chat_id, text: boodskap, parse_mode: "HTML", disable_web_page_preview: true }),
        }).catch(() => null);
        res?.ok ? gestuur++ : misluk++;
      }
    }
  }

  return NextResponse.json({ ok: true, notas: geskryf.length, simbole: geskryf.map((n) => n.simbool), gestuur, misluk });
}
