import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SPONSORS, bestemmingMetUtm, type Plek, type SponsorSleutel } from "@/lib/sponsor";
import { besoekerHash, dagSleutelVan, isKruiper } from "@/lib/sponsor-klik";
import { GIDSE } from "@/lib/gidse";

/* Elke borg-klik loop hierdeur sodat Buitelyn sy eie, verdedigbare telling het.
   Die besoeker word ONMIDDELLIK herlei; die log gebeur ná die antwoord met
   after(), so niemand wag ooit op die databasis nie. */

const PLEKKE: Plek[] = ["inlyn", "voetkaart"];
const DEDUPE_MS = 30_000;

export async function GET(request: NextRequest, ctx: { params: Promise<{ sponsor: string }> }) {
  const { sponsor } = await ctx.params;
  if (!(sponsor in SPONSORS)) return new NextResponse("Onbekende borg", { status: 404 });
  const sleutel = sponsor as SponsorSleutel;

  const gids = request.nextUrl.searchParams.get("g") ?? "";
  const rouPlek = request.nextUrl.searchParams.get("p") ?? "";
  const plek = PLEKKE.find((p) => p === rouPlek);
  const ua = request.headers.get("user-agent");

  const antwoord = NextResponse.redirect(bestemmingMetUtm(sleutel, gids), 307);

  // `g` is attacker-gekose vry teks in die versoek-URL. Sonder hierdie toets
  // omseil enige onbekende gids-slug die (besoeker_hash, gids)-ontdubbeling
  // heeltemal — elke unieke `g`-waarde is 'n nuwe ry — en beland vullis-teks
  // regstreeks in die CSV wat vir EasyEquities uitgevoer word.
  const gidsBestaan = GIDSE.some((g) => g.slug === gids);
  const logbaar =
    gidsBestaan && Boolean(plek) && !isKruiper(ua) &&
    Boolean(process.env.APHQ_SUPABASE_URL) && Boolean(process.env.APHQ_SUPABASE_SERVICE_KEY);
  if (!logbaar) return antwoord;

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "onbekend";
  const verwysing = (() => {
    try {
      return new URL(request.headers.get("referer") ?? "").hostname || null;
    } catch {
      return null; // net die gasheer, nooit die volle URL
    }
  })();

  after(async () => {
    try {
      const hash = await besoekerHash(ip, ua!, dagSleutelVan(new Date()));
      const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
        auth: { persistSession: false },
      });
      const { data: onlangs } = await sb
        .from("sponsor_klikke")
        .select("id")
        .eq("besoeker_hash", hash)
        .eq("gids", gids)
        .gte("geskep_at", new Date(Date.now() - DEDUPE_MS).toISOString())
        .limit(1);
      if (onlangs?.length) return; // dubbelklik / terug-en-weer
      await sb.from("sponsor_klikke").insert({
        sponsor: sleutel,
        gids,
        plek: plek!,
        besoeker_hash: hash,
        verwysing,
      });
    } catch (fout) {
      /* 'n verlore klik is beter as 'n gebreekte herleiding — die besoeker het
         reeds sy antwoord. Maar 'n STIL fout hier (bv. 'n ontbrekende
         KLIK_SOUT in produksie) sou elke klik geruisloos ontel laat: presies
         die stille ondertelling wat die syfer vir EasyEquities ondermyn.
         Rapporteer dit dus hard na die bediener se logs (Vercel runtime logs)
         — sonder ooit die rou IP daarin te noem. */
      console.error("[/uit] kon borg-klik nie log nie", {
        sponsor: sleutel,
        gids,
        plek,
        fout: fout instanceof Error ? fout.message : String(fout),
      });
    }
  });

  return antwoord;
}
