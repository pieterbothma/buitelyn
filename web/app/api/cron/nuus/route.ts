import { NextResponse, type NextRequest } from "next/server";
import { vertaalNuweNuus } from "@/lib/markets/nuus";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 120;

/* Nuus-vertalings: haal die bord se huidige 10 items en laat Gemini die
   onvertaaldes skryf. Dit het vroeër binne kryNuus geloop — dus op /markte
   se kritieke pad, met 'n 30s-timeout wat 'n gewone bladlaai kon ophou.
   Hier loop dit vooruit, en die render lees net wat reeds gestoor is. */

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;
  try {
    const uitslag = await vertaalNuweNuus();
    return NextResponse.json({ ok: true, ...uitslag });
  } catch (e) {
    return NextResponse.json({ ok: false, fout: (e as Error).message }, { status: 500 });
  }
}
