import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { replicateConfigured, verwyderAgtergrondReplicate } from "@/lib/replicate";

export const maxDuration = 120;

/* Verwyder 'n beeld se agtergrond en stoor die uitset in ons eie bucket.

   Replicate se uitset-URL is TYDELIK (replicate.delivery hou dit ongeveer 'n
   uur), so ons laai dit dadelik af en herhuisves dit — anders sou 'n gestoorde
   kaart se beeld môre verdwyn, en Buffer sou 'n dooie skakel kry.

   Gee 503 terug wanneer daar geen token is nie, sodat die kliënt na die
   blaaier-model kan terugval eerder as om net te misluk. */

export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  if (!replicateConfigured()) {
    return NextResponse.json({ fout: "REPLICATE_API_TOKEN ontbreek" }, { status: 503 });
  }

  const { url, datum } = (await request.json().catch(() => ({}))) as {
    url?: string;
    datum?: string;
  };
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ fout: "geen geldige beeld-URL nie" }, { status: 400 });
  }

  const dag = /^\d{4}-\d{2}-\d{2}$/.test(datum ?? "")
    ? datum!
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  try {
    const uitsetUrl = await verwyderAgtergrondReplicate(url);

    const haal = await fetch(uitsetUrl, { signal: AbortSignal.timeout(60_000) });
    if (!haal.ok) throw new Error(`Kon nie die uitset aflaai nie (${haal.status})`);
    const rou = Buffer.from(await haal.arrayBuffer());

    // Normaliseer soos by 'n gewone oplaai: PNG (ons wil die alfa hou) en
    // hoogstens 1600px, want satori haal die beeld by ELKE render weer af.
    const beeld = await sharp(rou)
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const meta = await sharp(beeld).metadata();

    const pad = `${dag}/uitgesny-${Date.now()}.png`;
    const svc = supabaseService();
    const { error } = await svc.storage
      .from("konsep-fotos")
      // Rou Buffer word deur storage as teks gemangel — altyd as Blob.
      .upload(pad, new Blob([new Uint8Array(beeld)], { type: "image/png" }), {
        contentType: "image/png",
      });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${pad}`,
      wydte: meta.width ?? 0,
      hoogte: meta.height ?? 0,
      deursigtig: Boolean(meta.hasAlpha),
    });
  } catch (e) {
    return NextResponse.json(
      { fout: e instanceof Error ? e.message : "Kon nie die agtergrond verwyder nie" },
      { status: 502 }
    );
  }
}
