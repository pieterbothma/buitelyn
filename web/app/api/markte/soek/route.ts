import { NextResponse, type NextRequest } from "next/server";
import { isGeldigeSimbool } from "@/lib/markets/boards";

/* Ticker search for the portfolio: proxies Yahoo's keyless search endpoint
   so users can hold anything Yahoo quotes, not just the curated boards. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 2) return NextResponse.json({ resultate: [] });

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
      {
        next: { revalidate: 3600 },
        headers: { "user-agent": "Mozilla/5.0 (compatible; BuitelynMarkte/1.0)" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    const data = await res.json();
    const resultate = ((data?.quotes ?? []) as Record<string, unknown>[])
      .filter((r) => typeof r.symbol === "string" && isGeldigeSimbool(r.symbol as string))
      .filter((r) => ["EQUITY", "ETF", "INDEX", "CRYPTOCURRENCY", "CURRENCY"].includes(String(r.quoteType)))
      .slice(0, 6)
      .map((r) => ({
        simbool: r.symbol as string,
        naam: String(r.shortname ?? r.longname ?? r.symbol).replace(/\s+R$/, "").trim(),
        beurs: String(r.exchDisp ?? ""),
      }));
    // JSE eerste — dis ons gehoor se tuisbeurs
    resultate.sort((a, b) => Number(b.beurs.includes("Johannesburg")) - Number(a.beurs.includes("Johannesburg")));
    return NextResponse.json(
      { resultate },
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ resultate: [] });
  }
}
