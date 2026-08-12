import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cronGeweier } from "@/lib/cron-hek";

/* Daaglikse opruiming: nuus-rye ouer as 72 uur word geskrap. Nie 24u nie —
   die RSS-bronne lys stories nog 2-3 dae, en 'n te vroeë skrap laat die
   pyplyn dieselfde storie her-ingest én her-opsom (Gemini-koste) totdat dit
   uit die voer val. Teen 72u is skrap finaal. */
const RETENSIE_URE = 72;

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;

  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
  const drempel = new Date(Date.now() - RETENSIE_URE * 60 * 60 * 1000).toISOString();

  const { count: nuusGeskrap } = await sb
    .from("markte_nuus")
    .delete({ count: "exact" })
    .lt("gepubliseer", drempel);
  const { count: rouGeskrap } = await sb
    .from("markte_nuus_rou")
    .delete({ count: "exact" })
    .lt("gepubliseer", drempel);

  return NextResponse.json({ ok: true, drempel, nuusGeskrap, rouGeskrap });
}
