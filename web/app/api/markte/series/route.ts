import { NextResponse, type NextRequest } from "next/server";
import { getSeries, type ReeksRange } from "@/lib/markets/source";
import { isGeldigeSimbool } from "@/lib/markets/boards";

const RANGES = new Set(["1d", "5d", "1mo", "6mo", "ytd", "1y", "5y", "max"]);

export async function GET(request: NextRequest) {
  const simbool = (request.nextUrl.searchParams.get("simbool") ?? "").toUpperCase();
  if (!isGeldigeSimbool(simbool)) {
    return NextResponse.json({ fout: "ongeldige simbool" }, { status: 400 });
  }
  const rangeParam = request.nextUrl.searchParams.get("reeks") ?? "1mo";
  const range = (RANGES.has(rangeParam) ? rangeParam : "1mo") as ReeksRange;
  const reeks = await getSeries(simbool, range);
  return NextResponse.json(
    { reeks },
    { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
