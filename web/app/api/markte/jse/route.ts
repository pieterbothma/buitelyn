import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/markets/source";
import { JSE_UITGEBREID } from "@/lib/markets/boards";

/* Volle JSE-universum vir die "Sien meer"-popup — ~100 name, bediener-kant
   gekas (elke Yahoo-haal het sy eie 60s ISR-kas), dus een stel oproepe
   per minuut ongeag hoeveel lesers die popup oopmaak. */
export async function GET() {
  const kwotasies = await getQuotes(JSE_UITGEBREID.map((i) => i.simbool));
  return NextResponse.json(
    { kwotasies },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
