import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* Nuusbrief-inteken. Skryf na Buitelyn se eie tabel, nie na Substack nie —
   dis die hele punt: die lys moet ons s'n wees.

   Bediener-kant met die diens-sleutel, want die tabel het RLS aan en geen
   policies nie. Die blaaier stuur net 'n adres; hy kan die lys nooit lees
   nie. */

export const runtime = "nodejs";

const EPOS = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  let liggaam: { epos?: unknown; webwerf?: unknown };
  try {
    liggaam = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldige versoek." }, { status: 400 });
  }

  /* Heuningpot. Die veld is in die vorm versteek, dus vul net 'n bot dit in.
     Ons antwoord met sukses eerder as 'n fout — 'n bot wat 'n fout kry,
     probeer weer met 'n ander vorm; een wat "reg so" kry, gaan weg. */
  if (typeof liggaam.webwerf === "string" && liggaam.webwerf.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const epos = String(liggaam.epos ?? "").trim().toLowerCase();
  if (epos.length > 254 || !EPOS.test(epos)) {
    return NextResponse.json({ fout: "Daardie e-posadres lyk nie reg nie." }, { status: 400 });
  }

  const url = process.env.APHQ_SUPABASE_URL;
  const sleutel = process.env.APHQ_SUPABASE_SERVICE_KEY;
  if (!url || !sleutel) {
    return NextResponse.json({ fout: "Inteken is nou nie beskikbaar nie." }, { status: 503 });
  }

  const sb = createClient(url, sleutel, { auth: { persistSession: false } });
  /* upsert met ignoreDuplicates: iemand wat twee keer inteken moet dieselfde
     vriendelike antwoord kry as die eerste keer, nie 'n fout oor 'n botsing
     nie — en sy oorspronklike geskep_at moet behoue bly. */
  const { error } = await sb
    .from("nuusbrief_intekenare")
    .upsert({ epos, bron: "tuisblad" }, { onConflict: "epos", ignoreDuplicates: true });

  if (error) {
    console.error("nuusbrief-inteken het misluk:", error.message);
    return NextResponse.json({ fout: "Iets het verkeerd geloop. Probeer weer." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
