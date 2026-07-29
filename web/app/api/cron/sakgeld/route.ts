import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { beantwoordMarkteVraag } from "@/lib/markets/agent";

export const maxDuration = 120;

/* Sakgeld-syfers: repo/prima/KPI/PPI daagliks uit die SARB se amptelike API;
   petrol/diesel maandeliks via die gegronde agent (web-soektog + bronvereiste)
   omdat die DMRE/AA geen skoon API het nie. */

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fout: "nee" }, { status: 401 });
  }
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  // 1. SARB — amptelik, deterministies
  let sarb = 0;
  try {
    const res = await fetch("https://custom.resbank.co.za/SarbWebApi/WebIndicators/HomePageRates", {
      cache: "no-store",
    });
    const data = (await res.json()) as { Name: string; Date: string; Value: number }[];
    const wil: Record<string, { sleutel: string; naam: string }> = {
      "SARB Policy Rate": { sleutel: "repo", naam: "Repokoers" },
      "Prime lending rate": { sleutel: "prima", naam: "Prima-uitleenkoers" },
      CPI: { sleutel: "kpi", naam: "Inflasie (KPI)" },
      PPI: { sleutel: "ppi", naam: "Produsente-inflasie (PPI)" },
    };
    for (const r of data) {
      const w = wil[r.Name];
      if (!w || typeof r.Value !== "number") continue;
      await sb.from("sakgeld_syfers").upsert(
        {
          sleutel: w.sleutel,
          naam: w.naam,
          waarde: r.Value,
          eenheid: "%",
          datum_effektief: r.Date,
          bron: "SA Reserwebank",
          bygewerk: new Date().toISOString(),
        },
        { onConflict: "sleutel" }
      );
      sarb++;
    }
  } catch {
    /* volgende lopie */
  }

  // 2. Petrol/diesel — net as die syfer vermoedelik verouderd is
  //    (maandaanpassing eerste Woensdag; verfris eerste 7 dae van die maand
  //    of as ouer as 25 dae)
  let petrol = "oorgeslaan";
  const { data: bestaande } = await sb.from("sakgeld_syfers").select("bygewerk").eq("sleutel", "petrol95").maybeSingle();
  const dagVanMaand = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", day: "2-digit" }).format(new Date()));
  const oud = !bestaande || Date.now() - new Date(bestaande.bygewerk).getTime() > 25 * 24 * 60 * 60 * 1000;
  const vroegInMaand = dagVanMaand <= 7 && (!bestaande || Date.now() - new Date(bestaande.bygewerk).getTime() > 5 * 24 * 60 * 60 * 1000);
  if (oud || vroegInMaand) {
    try {
      const antwoord = await beantwoordMarkteVraag(
        [
          {
            rol: "gebruiker",
            teks: "Wat is die huidige amptelike Suid-Afrikaanse petrolprys (95 ULP, binneland/Gauteng) en dieselprys (0.05%/50ppm, binneland) in rand per liter?",
          },
        ],
        {
          ekstraInstruksies:
            'Gebruik web-soektog na die JONGSTE amptelike DMRE/AA-brandstofpryse. Antwoord SLEGS met JSON in presies dié vorm, niks anders nie: {"petrol95": 21.45, "diesel": 19.30, "maand": "Augustus 2026"} — syfers in rand per liter, binneland. As jy nie seker is nie, gee null vir daardie veld.',
        }
      );
      const m = antwoord.match(/\{[\s\S]*\}/);
      const uit = m ? (JSON.parse(m[0]) as { petrol95?: number | null; diesel?: number | null; maand?: string }) : null;
      const geldig = (v: unknown): v is number => typeof v === "number" && v > 10 && v < 45;
      let n = 0;
      if (uit && geldig(uit.petrol95)) {
        await sb.from("sakgeld_syfers").upsert(
          { sleutel: "petrol95", naam: "Petrol 95 (binneland)", waarde: uit.petrol95, eenheid: "R/l", datum_effektief: uit.maand ?? null, bron: "DMRE/AA via soektog", bygewerk: new Date().toISOString() },
          { onConflict: "sleutel" }
        );
        n++;
      }
      if (uit && geldig(uit.diesel)) {
        await sb.from("sakgeld_syfers").upsert(
          { sleutel: "diesel", naam: "Diesel 50ppm (binneland)", waarde: uit.diesel, eenheid: "R/l", datum_effektief: uit.maand ?? null, bron: "DMRE/AA via soektog", bygewerk: new Date().toISOString() },
          { onConflict: "sleutel" }
        );
        n++;
      }
      petrol = `${n} bygewerk`;
    } catch {
      petrol = "agent-fout";
    }
  }

  return NextResponse.json({ ok: true, sarb, petrol });
}
