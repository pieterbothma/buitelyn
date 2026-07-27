import { NextResponse, type NextRequest } from "next/server";
import { getQuotes } from "@/lib/markets/source";
import { ALLE_SIMBOLE, isGeldigeSimbool } from "@/lib/markets/boards";

export async function GET(request: NextRequest) {
  /* Portfolio holdings may live outside the curated boards — the client
     sends those as ?ekstra=CSV (validated, capped). */
  const ekstra = (request.nextUrl.searchParams.get("ekstra") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s && isGeldigeSimbool(s) && !ALLE_SIMBOLE.includes(s))
    .slice(0, 20);

  const kwotasies = await getQuotes([...ALLE_SIMBOLE, ...ekstra]);
  return NextResponse.json(
    { kwotasies, tyd: new Date().toISOString() },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
