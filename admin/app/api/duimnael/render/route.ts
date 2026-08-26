import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { renderDuimnael } from "@/lib/duimnael/render";
import { normaliseerDuimnael } from "@/lib/duimnael/spec";

export const maxDuration = 30;

/* Die kliënt stuur 'n spec; ons stuur 'n PNG terug. Die spec word ALTYD
   genormaliseer voordat dit die renderaar sien — die blaaier is nie 'n
   vertroude bron nie. */
export async function POST(request: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const rou = await request.json().catch(() => null);
  const duimnael = normaliseerDuimnael(rou?.duimnael);
  const skaal = typeof rou?.skaal === "number" ? rou.skaal : 1;

  const png = await renderDuimnael(duimnael, skaal);
  return new NextResponse(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "no-store" },
  });
}
