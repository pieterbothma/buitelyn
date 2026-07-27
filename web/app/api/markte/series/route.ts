import { NextResponse, type NextRequest } from "next/server";
import { getSeries } from "@/lib/markets/source";
import { isGeldigeSimbool } from "@/lib/markets/boards";

export async function GET(request: NextRequest) {
  const simbool = (request.nextUrl.searchParams.get("simbool") ?? "").toUpperCase();
  if (!isGeldigeSimbool(simbool)) {
    return NextResponse.json({ fout: "ongeldige simbool" }, { status: 400 });
  }
  const reeks = await getSeries(simbool, "1mo");
  return NextResponse.json(
    { reeks },
    { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
