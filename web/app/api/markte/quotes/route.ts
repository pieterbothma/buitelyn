import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/markets/source";
import { ALLE_SIMBOLE } from "@/lib/markets/boards";

export async function GET() {
  const kwotasies = await getQuotes(ALLE_SIMBOLE);
  return NextResponse.json(
    { kwotasies, tyd: new Date().toISOString() },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
