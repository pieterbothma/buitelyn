import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 300;

/* SENS Vertaal — elke 30 min gedurende beursdae. Bron: Sharenet se vrye
   SENS-blad (lys + volteks in 'n <pre>-blok). Nuwe items met 'n JSE-kode
   word gehaal, Gemini klassifiseer + skryf een Afrikaanse sin, en
   gekoppelde gebruikers wie se aandele aankondig, kry 'n bot-boodskap. */

const LYS_URL = "https://www.sharenet.co.za/v3/sens.php";
const UA = { "user-agent": "Mozilla/5.0 (compatible; BuitelynSens/1.0)" };
const MAKS_PER_LOPIE = 25;

const TIPES = ["resultate", "dividend", "direkteure", "transaksie", "terugkoop", "notering", "agv", "kennisgewing"] as const;

type LysItem = { sensId: string; tyd: string; kode: string | null; maatskappy: string; titel: string; skakel: string };

function ontleedLys(html: string): LysItem[] {
  const items: LysItem[] = [];
  const maande: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  for (const ry of html.split(/<tr[^>]*>/).slice(1)) {
    const storie = ry.match(
      /<a href="(\/v3\/sens_display\.php\?tdate=(\d+)&(?:amp;)?seq=(\d+)[^"]*)"[^>]*class="sens-story-link"[^>]*>([^<]+)</
    );
    if (!storie) continue;
    const kodeM = ry.match(/quickshare\.php\?scode=([A-Z0-9]+)/);
    const tydM = ry.match(/(\d{2}):(\d{2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    let tyd = new Date().toISOString();
    if (tydM) {
      const [, uu, mm, dag, mnd, jaar] = tydM;
      tyd = `${jaar}-${maande[mnd] ?? "01"}-${dag.padStart(2, "0")}T${uu}:${mm}:00+02:00`;
    }
    const vol = storie[4].replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ").trim();
    const splitsPunt = vol.indexOf(" - ");
    items.push({
      sensId: `${storie[2]}-${storie[3]}`,
      tyd,
      kode: kodeM ? kodeM[1] : null,
      maatskappy: splitsPunt > 0 ? vol.slice(0, splitsPunt).trim() : vol,
      titel: splitsPunt > 0 ? vol.slice(splitsPunt + 3).trim() : vol,
      skakel: `https://www.sharenet.co.za${storie[1].replace(/&amp;/g, "&")}`,
    });
  }
  const uniek = new Map<string, LysItem>();
  for (const i of items) if (!uniek.has(i.sensId)) uniek.set(i.sensId, i);
  return [...uniek.values()];
}

async function haalVolteks(skakel: string): Promise<string> {
  try {
    const res = await fetch(skakel, { headers: UA });
    if (!res.ok) return "";
    const pre = (await res.text()).match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    if (!pre) return "";
    return pre[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#?\w+;/g, " ")
      .slice(0, 7000);
  } catch {
    return "";
  }
}

async function klassifiseer(items: { titel: string; maatskappy: string; teks: string }[]): Promise<{ tipe: string; opsomming: string }[]> {
  const lys = items
    .map((i, n) => `--- ITEM ${n + 1}: ${i.maatskappy} — ${i.titel}\n${i.teks.slice(0, 3500)}`)
    .join("\n\n");
  const prompt = `Hier is ${items.length} JSE SENS-aankondigings. Vir ELKE item, gee:
1. "tipe": presies een van ${TIPES.join(", ")}. (resultate=finansiële resultate/trading statements; dividend=dividende/uitkerings/rente; direkteure=direkteurshandel/-aanstellings; transaksie=verkrygings/verkope/samesmeltings; terugkoop=aandeleterugkope; notering=noterings/delistings/nuwe effekte; agv=AJV/vergadering-uitslae; kennisgewing=alles anders)
2. "opsomming": EEN kort Afrikaanse sin (±20 woorde) wat vir 'n gewone belegger sê wat aangekondig is en hoekom dit saak maak. Geen jargon, geen simbole, syfers in mensetaal (R2,4 miljard). NOOIT Nederlandse of Duitse woorde nie.

Antwoord SLEGS met 'n JSON-lys: [{"tipe":"...","opsomming":"..."}] — presies ${items.length} items, in volgorde.

${lys}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const rou = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const uit = JSON.parse(rou) as { tipe: string; opsomming: string }[];
  return items.map((_, n) => ({
    tipe: TIPES.includes((uit[n]?.tipe ?? "") as (typeof TIPES)[number]) ? uit[n].tipe : "kennisgewing",
    opsomming: (uit[n]?.opsomming ?? "").slice(0, 300) || "",
  }));
}

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  const lysRes = await fetch(LYS_URL, { headers: UA });
  if (!lysRes.ok) return NextResponse.json({ fout: `bron ${lysRes.status}` }, { status: 502 });
  const alle = ontleedLys(await lysRes.text());
  if (!alle.length) return NextResponse.json({ fout: "lys leeg — selektors nagaan" }, { status: 500 });

  // net gelyste aandele (kode) en net nuwes
  const metKode = alle.filter((i) => i.kode);
  const { data: bestaande } = await sb
    .from("sens_aankondigings")
    .select("sens_id")
    .in("sens_id", metKode.map((i) => i.sensId));
  const klaar = new Set((bestaande ?? []).map((r) => r.sens_id));
  const nuwes = metKode.filter((i) => !klaar.has(i.sensId)).slice(0, MAKS_PER_LOPIE);
  if (!nuwes.length) return NextResponse.json({ ok: true, nuut: 0, gesien: alle.length });

  // volteks + klassifikasie (een Gemini-oproep vir die hele bondel)
  const tekste = await Promise.all(nuwes.map((i) => haalVolteks(i.skakel)));
  let klas: { tipe: string; opsomming: string }[];
  try {
    klas = await klassifiseer(nuwes.map((i, n) => ({ titel: i.titel, maatskappy: i.maatskappy, teks: tekste[n] })));
  } catch {
    klas = nuwes.map(() => ({ tipe: "kennisgewing", opsomming: "" }));
  }

  const rye = nuwes.map((i, n) => ({
    sens_id: i.sensId,
    tyd: i.tyd,
    kode: i.kode,
    maatskappy: i.maatskappy,
    titel: i.titel,
    tipe: klas[n].tipe,
    opsomming: klas[n].opsomming || null,
    skakel: i.skakel,
  }));
  const { error } = await sb.from("sens_aankondigings").upsert(rye, { onConflict: "sens_id" });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Dividend-items: onttrek gestruktureerde datums/bedrag vir die kalender
  const dividende = rye
    .map((r, n) => ({ r, teks: tekste[n] }))
    .filter((x) => x.r.tipe === "dividend" && x.teks);
  if (dividende.length) {
    try {
      const dPrompt = `Hier is ${dividende.length} JSE-dividend-aankondigings. Onttrek vir ELKE item:
- "bedrag_sent": die dividend in SENT per aandeel (bv. 190 vir 190 sent; as net rand gegee, skakel om; null as onduidelik)
- "ldt": laaste dag om te verhandel ("last day to trade", LDT) as YYYY-MM-DD (null as afwesig)
- "betaaldatum": betaaldatum ("payment date") as YYYY-MM-DD (null as afwesig)
Antwoord SLEGS met 'n JSON-lys van presies ${dividende.length} objekte in volgorde.

${dividende.map((x, n) => `--- ITEM ${n + 1}: ${x.r.maatskappy}\n${x.teks.slice(0, 3000)}`).join("\n\n")}`;
      const dRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: dPrompt }] }],
            generationConfig: { temperature: 0, responseMimeType: "application/json" },
          }),
        }
      );
      if (dRes.ok) {
        const dData = await dRes.json();
        const uit = JSON.parse(dData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]") as {
          bedrag_sent: number | null;
          ldt: string | null;
          betaaldatum: string | null;
        }[];
        const geldig = /^\d{4}-\d{2}-\d{2}$/;
        const kalenderRye = dividende
          .map((x, n) => ({
            sens_id: x.r.sens_id,
            kode: x.r.kode!,
            maatskappy: x.r.maatskappy,
            bedrag_sent: typeof uit[n]?.bedrag_sent === "number" ? uit[n].bedrag_sent : null,
            ldt: uit[n]?.ldt && geldig.test(uit[n].ldt!) ? uit[n].ldt : null,
            betaaldatum: uit[n]?.betaaldatum && geldig.test(uit[n].betaaldatum!) ? uit[n].betaaldatum : null,
          }))
          .filter((r) => r.ldt || r.betaaldatum || r.bedrag_sent);
        if (kalenderRye.length) {
          await sb.from("dividend_kalender").upsert(kalenderRye, { onConflict: "sens_id" });
        }
      }
    } catch {
      /* kalender is opsioneel — SENS-vloei mag nie breek nie */
    }
  }

  // Bot: eie-aandeel-kennisgewings (kode → .JO-simbool in portefeulje/dophou)
  let gestuur = 0;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const simbole = nuwes.map((i) => `${i.kode}.JO`);
    const [{ data: intekenare }, { data: houdings }, { data: dop }] = await Promise.all([
      sb.from("telegram_koppelinge").select("user_id, chat_id").not("chat_id", "is", null).eq("sens", true),
      sb.from("portefeuljes").select("user_id, simbool").in("simbool", simbole),
      sb.from("dophou").select("user_id, simbool").in("simbool", simbole),
    ]);
    const eie = new Map<string, Set<string>>();
    for (const r of [...(houdings ?? []), ...(dop ?? [])]) {
      const stel = eie.get(r.user_id) ?? new Set<string>();
      stel.add(r.simbool);
      eie.set(r.user_id, stel);
    }
    for (const g of intekenare ?? []) {
      const myne = rye.filter((r) => eie.get(g.user_id)?.has(`${r.kode}.JO`));
      if (!myne.length) continue;
      const blokke = myne.map(
        (r) => `⭐ <b>${r.maatskappy.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</b> het op SENS aangekondig:\n${(r.opsomming ?? r.titel).replace(/&/g, "&amp;").replace(/</g, "&lt;")}`
      );
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: g.chat_id,
          text: [`🔴 ${blokke.join("\n\n")}`, "", "Alles: buitelyn.com/markte?blad=sens"].join("\n"),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }).catch(() => null);
      if (res?.ok) gestuur++;
    }
  }

  return NextResponse.json({ ok: true, nuut: rye.length, gestuur, tipes: rye.map((r) => `${r.kode}:${r.tipe}`) });
}
