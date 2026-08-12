/* Die gedeelde leeslaag vir alles wat die cron reeds geskryf het.
   Dit het binne-in app/markte/page.tsx gewoon toe /markte die enigste leser
   was. Die tuisblad lees nou dieselfde oorsig, notas en kwotasies, en twee
   kopieë sou twee kas-sleutels beteken: dieselfde Supabase-navraag twee keer
   per venster, en twee plekke om reg te maak wanneer 'n kolom verander.
   Een module, een stel sleutels, albei blaaie deel die kas.

   Alles hier is IDENTIES vir elke besoeker. Persoonlike data — portefeulje,
   dophou, waarskuwings, profiel — bly doelbewus buite hierdie lêer en buite
   die kas, want dit hoort per versoek en live te wees. */
import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getQuotes } from "@/lib/markets/source";
import { kryNuus } from "@/lib/markets/nuus";
import type { SensItem } from "@/components/markte/sens";

export type SakgeldSyfer = {
  sleutel: string;
  naam: string;
  waarde: number;
  eenheid: string;
  datum_effektief: string | null;
};

export type Oorsig = {
  teks: string;
  bygewerk: string | null;
  oudioUrl: string | null;
  oudioDatum: string | null;
  oudioEtiket: string;
};

/* ap-hq se Supabase, met die diens-sleutel. Gee null terug eerder as om te
   gooi wanneer die omgewing nie gestel is nie: 'n plaaslike opstelling sonder
   sleutels moet die blad steeds kan wys, net sonder hierdie blokke. */
function aphq(): SupabaseClient | null {
  const url = process.env.APHQ_SUPABASE_URL;
  const sleutel = process.env.APHQ_SUPABASE_SERVICE_KEY;
  if (!url || !sleutel) return null;
  return createClient(url, sleutel, { auth: { persistSession: false } });
}

const jhbDag = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" });

async function kryNotas(): Promise<Record<string, string>> {
  const sb = aphq();
  if (!sb) return {};
  try {
    const vandag = jhbDag.format(new Date());
    const gister = jhbDag.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
    // albei dae, oudste eerste — vandag s'n oorskryf gister s'n per simbool
    const { data } = await sb
      .from("skuiwer_notas")
      .select("simbool, nota, datum")
      .in("datum", [gister, vandag])
      .order("datum", { ascending: true });
    return Object.fromEntries((data ?? []).map((r) => [r.simbool, r.nota]));
  } catch {
    return {};
  }
}

async function krySens(): Promise<SensItem[]> {
  const sb = aphq();
  if (!sb) return [];
  try {
    const { data } = await sb
      .from("sens_aankondigings")
      .select("sens_id, tyd, kode, maatskappy, titel, tipe, opsomming, skakel")
      .order("tyd", { ascending: false })
      .limit(80);
    return (data ?? []) as SensItem[];
  } catch {
    return [];
  }
}

async function krySakgeld(): Promise<SakgeldSyfer[]> {
  const sb = aphq();
  if (!sb) return [];
  try {
    const { data } = await sb.from("sakgeld_syfers").select("sleutel, naam, waarde, eenheid, datum_effektief");
    const orde = ["repo", "prima", "kpi", "petrol95", "diesel", "ppi"];
    return ((data ?? []) as SakgeldSyfer[]).sort((a, b) => orde.indexOf(a.sleutel) - orde.indexOf(b.sleutel));
  } catch {
    return [];
  }
}

export type Skuiwer = { simbool: string; delta: number; nota: string; datum: string };

/* Die dag se skuiwers, reguit uit die notas-tabel.
   Die alternatief was om 97 JSE-kwotasies te trek en dit teen die notas te
   pas — 97 Yahoo-oproepe per venster op die druksste blad van die werf, om
   by data uit te kom wat reeds langs die nota gestoor is. Die cron skryf
   delta_persent saam met elke nota, en dit skryf net vir die aandele wat
   werklik beweeg het. Een navraag, en elke ry het gewaarborg 'n rede.
   Let wel: die persentasie is dié van toe die nota geskryf is, nie live nie
   — vandaar dat die blok die datum wys eerder as om "nou" te impliseer. */
async function krySkuiwers(): Promise<Skuiwer[]> {
  const sb = aphq();
  if (!sb) return [];
  try {
    const { data } = await sb
      .from("skuiwer_notas")
      .select("datum, simbool, delta_persent, nota")
      .order("datum", { ascending: false })
      .limit(40);
    const jongste = data?.[0]?.datum;
    if (!jongste) return [];
    return (data ?? [])
      .filter((r) => r.datum === jongste && !/geen duidelike/i.test(r.nota))
      .map((r) => ({
        simbool: r.simbool as string,
        delta: Number(r.delta_persent),
        nota: r.nota as string,
        datum: r.datum as string,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  } catch {
    return [];
  }
}

async function kryOorsig(): Promise<Oorsig | null> {
  const sb = aphq();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("markte_oorsigte")
      .select("teks, datum, opgedateer_at, oudio_url")
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.teks) return null;
    const bygewerk = data.opgedateer_at
      ? new Intl.DateTimeFormat("af-ZA", {
          timeZone: "Africa/Johannesburg",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(data.opgedateer_at))
      : null;
    const oudioDatum = data.oudio_url
      ? new Intl.DateTimeFormat("af-ZA", {
          timeZone: "Africa/Johannesburg",
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date(`${data.datum}T12:00:00Z`))
      : null;
    const oudioEtiket = data.oudio_url?.includes("-aand.mp3")
      ? "LUISTER NA DIE DAGOPSOMMING"
      : data.oudio_url?.includes("-middag.mp3")
        ? "LUISTER NA DIE MIDDAGOORSIG"
        : "LUISTER NA DIE OGGENDOORSIG";
    return { teks: data.teks, bygewerk, oudioUrl: data.oudio_url ?? null, oudioDatum, oudioEtiket };
  } catch {
    return null;
  }
}

/* Vensters volg elke bron se cron: oorsig loop uurliks, SENS elke 30 min,
   nuus elke 15 min, sakgeld daagliks. */
export const gekasdeOorsig = unstable_cache(kryOorsig, ["markte-oorsig"], { revalidate: 300 });
export const gekasdeSens = unstable_cache(krySens, ["markte-sens"], { revalidate: 300 });
export const gekasdeSakgeld = unstable_cache(krySakgeld, ["markte-sakgeld"], { revalidate: 1800 });
export const gekasdeNotas = unstable_cache(kryNotas, ["markte-skuiwer-notas"], { revalidate: 300 });
export const gekasdeNuus = unstable_cache(kryNuus, ["markte-nuus"], { revalidate: 300 });
export const gekasdeSkuiwers = unstable_cache(krySkuiwers, ["markte-skuiwers"], { revalidate: 300 });

/* Kwotasies is reeds fetch-gekas, maar dis 23 (Tuis) tot 107 (Bewegers)
   aparte kas-opsoeke per render — op Vercel is elkeen 'n netwerkrondte.
   Dié wrapper maak dit een. Net vir die vaste borde: die portefeulje se
   simbole is per gebruiker en sou die kas-sleutels onbegrens laat groei. */
export const gekasdeBordKwotasies = unstable_cache(
  (simbole: string[]) => getQuotes(simbole),
  ["markte-bord-kwotasies"],
  { revalidate: 60 }
);
