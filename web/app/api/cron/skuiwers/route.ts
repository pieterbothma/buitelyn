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

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fout: "nee" }, { status: 401 });
  }
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  // 1. Skuiwers bo die drempel — NET kwotasies uit vandag se sessie.
  //    Net ná opening (±15 min vertraag) wys Yahoo nog gister se sessie;
  //    daardie bewegings is gister s'n en mag nie as vandag herontdek word nie.
  const kwotasies = await getQuotes(JSE_UITGEBREID.map((i) => i.simbool));
  const dagFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" });
  const vandagSast = dagFmt.format(new Date());
  const skuiwers = kwotasies
    .filter((k) => k.tyd && dagFmt.format(new Date(k.tyd)) === vandagSast)
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
            "Skryf presies EEN kort sin (±15 woorde) wat die rede vir die beweging gee, gegrond op kry_nuus en web-soektog — soos 'n koerant-onderskrif. Voorbeeld van die styl: 'Implats het Rustenburg se skagte tydelik gesluit ná veiligheidsinsidente.' As daar geen duidelike maatskappy-spesifieke rede is nie: 'Geen duidelike maatskappynuus nie — lyk na 'n breër sektorbeweging.' GEEN skakels, URL's, aanbiedinge, vrae of persentasies nie. Net die een sin.",
        }
      );
      const kort = nota.length > 200 ? `${nota.slice(0, 200).replace(/[.,;\s]+\S*$/, "")}…` : nota;
      geskryf.push({ simbool: k.simbool, naam, delta: k.deltaPersent!, nota: kort });
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
      const simbole = skuiwers.map((k) => k.simbool);
      const [{ data: houdings }, { data: dop }] = await Promise.all([
        sb.from("portefeuljes").select("user_id, simbool").in("simbool", simbole),
        sb.from("dophou").select("user_id, simbool").in("simbool", simbole),
      ]);
      const eie = new Set([...(houdings ?? []), ...(dop ?? [])].map((r) => `${r.user_id}:${r.simbool}`));

      // Een blokkie per NUWE skuiwer (Piet se formaat):
      //   Naam is aan die beweeg
      //   ▲ +3,53%
      for (const g of intekenare) {
        const blokke = geskryf.map((n) => {
          const merk = eie.has(`${g.user_id}:${n.simbool}`) ? " ⭐" : "";
          const pyl = n.delta >= 0 ? "▲ +" : "▼ −";
          return `<b>${htmlOntsnap(n.naam)}</b> is aan die beweeg${merk}\n${pyl}${Math.abs(n.delta).toFixed(2).replace(".", ",")}%`;
        });
        const boodskap = [`🔴 ${blokke.join("\n\n")}`, "", "Die hoekom: buitelyn.com/markte?blad=bewegers · ±15 min vertraag"].join("\n");
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
