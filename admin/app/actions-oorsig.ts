"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { skryfAfrikaans } from "@/lib/gemini";

function vandagSAST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
}

async function aangemeld(): Promise<boolean> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return Boolean(user);
}

/** AP se oggend-oorsig-resep: JSE-skuiwe (vorige sessie) met 'n rede nét as
 *  daar 'n nuusgegronde skuiwer-nota is; BTC/ETH in dollar; Nasdaq & S&P net
 *  groen of rooi; opsioneel een vooruitsig-storie uit die Substack — anders
 *  eindig dit daar. */
export async function skepOorsig(): Promise<string | null> {
  if (!(await aangemeld())) return null;

  // 1. JSE-skuiwe: die volle universum met name; die jongste sessie se deltas.
  //    Soggens (voor/naby opening) wys dit presies die vorige dag — die resep.
  let skuiwe = "";
  try {
    const res = await fetch("https://www.buitelyn.com/api/markte/jse", { cache: "no-store" });
    const { kwotasies } = (await res.json()) as {
      kwotasies: { simbool: string; naam: string; prys: number; deltaPersent: number | null }[];
    };
    skuiwe = kwotasies
      .filter((k) => k.deltaPersent != null)
      .sort((a, b) => Math.abs(b.deltaPersent!) - Math.abs(a.deltaPersent!))
      .slice(0, 8)
      .map((k) => `${k.naam} (${k.simbool.replace(".JO", "")}): ${k.deltaPersent! >= 0 ? "+" : ""}${k.deltaPersent!.toFixed(2)}%`)
      .join("; ");
  } catch {
    /* leeg */
  }

  // 2. Gegronde redes: die jongste dag se skuiwer-notas (KI-notas met nuus-basis).
  const svc = supabaseService();
  const { data: notaRye } = await svc
    .from("skuiwer_notas")
    .select("datum, simbool, delta_persent, nota")
    .order("datum", { ascending: false })
    .limit(12);
  const jongsteNotaDag = notaRye?.[0]?.datum;
  const redes = (notaRye ?? [])
    .filter((r) => r.datum === jongsteNotaDag && !/geen duidelike/i.test(r.nota))
    .map((r) => `${r.simbool.replace(".JO", "")} (${Number(r.delta_persent) >= 0 ? "+" : ""}${Number(r.delta_persent).toFixed(1)}%): ${r.nota}`)
    .join("\n");

  // 3. Kripto in USD + VSA-indekse (rigting)
  let kripto = "";
  let vsa = "";
  try {
    const res = await fetch("https://www.buitelyn.com/api/markte/quotes?ekstra=BTC-USD,ETH-USD", { cache: "no-store" });
    const { kwotasies } = (await res.json()) as {
      kwotasies: { simbool: string; prys: number; deltaPersent: number | null }[];
    };
    const kry = (s: string) => kwotasies.find((k) => k.simbool === s);
    const btc = kry("BTC-USD");
    const eth = kry("ETH-USD");
    if (btc) kripto += `Bitcoin: $${Math.round(btc.prys).toLocaleString("en-US")}. `;
    if (eth) kripto += `Ethereum: $${Math.round(eth.prys).toLocaleString("en-US")}.`;
    const nasdaq = kry("^IXIC");
    const sp = kry("^GSPC");
    if (nasdaq?.deltaPersent != null && sp?.deltaPersent != null) {
      vsa = `Nasdaq: ${nasdaq.deltaPersent >= 0 ? "op (groen)" : "af (rooi)"}; S&P 500: ${sp.deltaPersent >= 0 ? "op (groen)" : "af (rooi)"}`;
    }
  } catch {
    /* leeg */
  }

  // 4. Moontlike vooruitsig-storie: jongste Substack-plasings (dalk 'n week-vooruit-uitgawe)
  let substack = "";
  try {
    const res = await fetch("https://buitelyn.substack.com/feed", {
      next: { revalidate: 600 },
      headers: { "user-agent": "Mozilla/5.0 (compatible; BuitelynHQ/1.0)" },
    });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5);
    substack = items
      .map((m) => {
        const titel = m[1].match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] ?? "";
        const opsom = m[1].match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] ?? "";
        return `"${titel}" — ${opsom.replace(/<[^>]+>/g, "").slice(0, 160)}`;
      })
      .join("\n");
  } catch {
    /* leeg */
  }

  const teks = await skryfAfrikaans(`Skryf AP se kort oggend-markte-oorsig (±140 woorde, vloeiende paragrawe, geen opskrifte of kolpunte nie) presies volgens dié resep, in dié volgorde:

1. Die grootste aandeel-skuiwe op die Johannesburgse Aandelebeurs (JSE) die vorige dag — noem 2 tot 4 uit die lys hieronder met hul persentasies. Gee ten minste EEN goeie rede hoekom een aandeel so beweeg het, MAAR SLEGS as daar 'n nuusgegronde rede in die REDES-lys hieronder is. As die REDES-lys leeg is, noem net die skuiwe sonder om 'n rede te versin.
2. Waar die prys van Bitcoin en Ethereum geëindig het, in Amerikaanse dollar.
3. Of die Nasdaq en die S&P 500 op of af was — SONDER persentasies; net of dit 'n groen of 'n rooi dag in Amerika was.
4. As een van die Substack-plasings hieronder duidelik 'n week-vooruit- of vooruitskouing-uitgawe is, sluit af met EEN storie waarna ons dié week uitsien, uit daardie plasing. As daar nie so 'n plasing is nie (wat meestal die geval sal wees), eindig die oorsig eenvoudig ná punt 3 — GEEN geforseerde afsluiting nie.

Syfers in mensetaal. Moenie enige feite byvoeg wat nie hieronder staan nie.

JSE-SKUIWE (vorige sessie): ${skuiwe || "geen data"}

REDES (nuusgegrond, mag gebruik word): ${redes || "GEEN — noem skuiwe sonder redes"}

KRIPTO: ${kripto || "geen data"}

VSA: ${vsa || "geen data"}

SUBSTACK-PLASINGS (net vir punt 4): ${substack || "geen"}`);

  return teks;
}

export type StudioOorsig = { datum: string; teks: string; opgedateer_at: string; oudio_teks?: string | null };

export async function kryOorsigte(): Promise<StudioOorsig[]> {
  if (!(await aangemeld())) return [];
  const sb = await supabaseServer();
  const { data } = await sb
    .from("studio_oorsigte")
    .select("datum, teks, opgedateer_at, oudio_teks")
    .order("datum", { ascending: false })
    .limit(14);
  return (data ?? []) as StudioOorsig[];
}

/* Gee ALBEI tekste terug. Die oudio-skrip is 'n aparte redigeerbare veld en
   moet saam met die dag gelaai word, anders wys die studio 'n leë oudio-boks
   vir 'n dag wat wel een het. */
export async function kryOorsigVirDag(datum: string): Promise<{ teks: string; oudioTeks: string } | null> {
  if (!(await aangemeld())) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from("studio_oorsigte").select("teks, oudio_teks").eq("datum", datum).maybeSingle();
  if (!data) return null;
  return { teks: data.teks ?? "", oudioTeks: data.oudio_teks ?? "" };
}

export async function stoorOorsig(teks: string, datum?: string, oudioTeks?: string): Promise<void> {
  if (!(await aangemeld())) return;
  const sb = await supabaseServer();
  /* oudioTeks word NET geskryf as dit meegestuur is. 'n Onvoorwaardelike
     veld sou die oudio-skrip uitvee elke keer as iemand net die hoofteks
     stoor. */
  await sb.from("studio_oorsigte").upsert(
    {
      datum: datum ?? vandagSAST(),
      teks,
      ...(oudioTeks === undefined ? {} : { oudio_teks: oudioTeks }),
      opgedateer_at: new Date().toISOString(),
    },
    { onConflict: "datum" }
  );
  revalidatePath("/w/buitelyn/oorsig");
}
