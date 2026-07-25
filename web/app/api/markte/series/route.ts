import { NextResponse, type NextRequest } from "next/server";
import { getSeries } from "@/lib/markets/source";
import { ALLE_SIMBOLE } from "@/lib/markets/boards";

export async function GET(request: NextRequest) {
  const simbool = request.nextUrl.searchParams.get("simbool") ?? "";
  if (!ALLE_SIMBOLE.includes(simbool)) {
    return NextResponse.json({ fout: "onbekende simbool" }, { status: 400 });
  }
  const reeks = await getSeries(simbool, "1mo");
  return NextResponse.json(
    { reeks },
    { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
