import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { renderGrafiekPng, type GrafiekReeks, type GrafiekTipe } from "@/lib/grafiek-render";

export const maxDuration = 60;

const RANGES = new Set(["5d", "1mo", "6mo", "ytd", "1y", "5y", "max"]);
const TIPES = new Set(["vergelyking", "enkel", "staaf"]);
const RANGE_NAAM: Record<string, string> = {
  "5d": "laaste 5 dae",
  "1mo": "laaste maand",
  "6mo": "laaste 6 maande",
  ytd: "vanjaar tot nou",
  "1y": "laaste jaar",
  "5y": "laaste 5 jaar",
  max: "sedert notering",
};

export async function GET(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Response("verbode", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const tipe = (TIPES.has(sp.get("tipe") ?? "") ? sp.get("tipe") : "vergelyking") as GrafiekTipe;
  const reeks = RANGES.has(sp.get("reeks") ?? "") ? sp.get("reeks")! : "1y";
  // simbole=NPN.JO:Naspers,0700.HK:Tencent — naam is opsioneel
  const pare = (sp.get("simbole") ?? "")
    .split(",")
    .map((deel) => {
      const [sim, ...naamDele] = deel.split(":");
      return { simbool: sim.trim().toUpperCase(), naam: naamDele.join(":").trim() };
    })
    .filter((p) => /^[A-Z0-9^][A-Z0-9.^=-]{0,11}$/.test(p.simbool))
    .slice(0, 6);
  const simbole = pare.map((p) => p.simbool);
  if (!simbole.length) return new Response("geen simbole", { status: 400 });

  // Reekse + name vanaf die publieke buitelyn.com-API's (bediener-kant)
  const [reeksData, kwotasieData] = await Promise.all([
    Promise.all(
      simbole.map(async (s) => {
        const res = await fetch(
          `https://www.buitelyn.com/api/markte/series?simbool=${encodeURIComponent(s)}&reeks=${reeks}`,
          { next: { revalidate: 300 } }
        );
        const d = res.ok ? await res.json() : { reeks: [] };
        return { simbool: s, punte: (d.reeks ?? []) as { t: number; p: number }[] };
      })
    ),
    fetch(`https://www.buitelyn.com/api/markte/quotes?ekstra=${encodeURIComponent(simbole.join(","))}`, {
      next: { revalidate: 300 },
    })
      .then((r) => (r.ok ? r.json() : { kwotasies: [] }))
      .catch(() => ({ kwotasies: [] })),
  ]);

  const kwotasies = (kwotasieData.kwotasies ?? []) as { simbool: string; geldeenheid: string }[];
  const naamVir = (s: string) => pare.find((p) => p.simbool === s)?.naam || s;

  const reekse: GrafiekReeks[] = reeksData
    .filter((r) => r.punte.length > 1)
    .map((r) => ({ simbool: r.simbool, naam: naamVir(r.simbool), punte: r.punte }));
  if (!reekse.length) return new Response("geen reeksdata", { status: 502 });

  const geldeenheid =
    tipe === "enkel" ? kwotasies.find((k) => k.simbool === simbole[0])?.geldeenheid ?? "ZAR" : undefined;

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const verstekOpskrif =
    tipe === "staaf"
      ? `Wie het gewen — ${RANGE_NAAM[reeks]}`
      : reekse.map((r) => r.simbool.replace(".JO", "")).join(" vs ");
  const png = await renderGrafiekPng({
    tipe,
    reekse,
    raam: sp.get("raam") === "kaal" ? "kaal" : "poskaart",
    opskrif: sp.get("opskrif")?.trim() || verstekOpskrif,
    subtitel: sp.get("subtitel")?.trim() || RANGE_NAAM[reeks],
    geldeenheid,
    datum,
  });

  if (sp.get("stoor") === "1") {
    const svc = supabaseService();
    const pad = `${datum}/grafiek-${Date.now()}.png`;
    const { error } = await svc.storage
      .from("konsep-fotos")
      .upload(pad, new Blob([new Uint8Array(png)], { type: "image/png" }), { contentType: "image/png" });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
    return NextResponse.json({
      ok: true,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${pad}`,
    });
  }

  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "private, no-store" },
  });
}
