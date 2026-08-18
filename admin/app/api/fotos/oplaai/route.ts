import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const maxDuration = 30;

/* Oplaai + normalisering vir kaart-beelde.

   Dit is 'n roete eerder as 'n direkte blaaier-oplaai omdat dit die ENIGSTE
   plek is waar 'n beeld die stelsel binnekom — so dit is die plek om dit
   veilig te maak voordat satori dit ooit sien:

     • EXIF-rotasie toepas en metadata stroop (foon-foto's kom gedraai aan);
     • die langste kant tot 1600px afskaal (satori haal die beeld by ELKE
       render weer af — 'n 8MP-foto maak elke voorskou stadig);
     • PNG as daar 'n alfakanaal is (uitgesnyde beelde), anders JPEG q85;
     • NOOIT WebP nie — satori dekodeer dit nie betroubaar nie en die kaart
       kom stil blank uit. Dit is die waarskynlikste stil produksiefout in
       hierdie hele module, so dit word hier doodgemaak.

   Dit meet ook die natuurlike afmetings een keer, sodat die snit-wiskunde
   hulle nie by elke render hoef te herbereken nie. */

const MAKS_BYTES = 15 * 1024 * 1024;
const MAKS_KANT = 1600;

export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  let vorm: FormData;
  try {
    vorm = await request.formData();
  } catch {
    return NextResponse.json({ fout: "ongeldige vorm" }, { status: 400 });
  }

  const leer = vorm.get("leer");
  if (!(leer instanceof File) || leer.size === 0) {
    return NextResponse.json({ fout: "geen lêer nie" }, { status: 400 });
  }
  if (leer.size > MAKS_BYTES) {
    return NextResponse.json({ fout: "Die lêer is groter as 15MB." }, { status: 413 });
  }

  const datum =
    typeof vorm.get("datum") === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(vorm.get("datum")))
      ? String(vorm.get("datum"))
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

  let beeld: Buffer;
  let wydte: number;
  let hoogte: number;
  let deursigtig: boolean;
  let ext: "png" | "jpg";

  try {
    const rou = Buffer.from(await leer.arrayBuffer());
    const basis = sharp(rou).rotate(); // pas EXIF-oriëntasie toe
    const meta = await basis.metadata();
    deursigtig = Boolean(meta.hasAlpha);

    const pyp = basis
      .resize({ width: MAKS_KANT, height: MAKS_KANT, fit: "inside", withoutEnlargement: true })
      .withMetadata({});

    ext = deursigtig ? "png" : "jpg";
    beeld = deursigtig
      ? await pyp.png({ compressionLevel: 9 }).toBuffer()
      : await pyp.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

    // Meet ná die skaal — dit is wat die snit-wiskunde moet hê.
    const na = await sharp(beeld).metadata();
    wydte = na.width ?? 0;
    hoogte = na.height ?? 0;
    if (!wydte || !hoogte) throw new Error("geen afmetings");
  } catch (e) {
    return NextResponse.json(
      { fout: e instanceof Error ? `Kon nie die beeld lees nie: ${e.message}` : "Kon nie lees nie" },
      { status: 400 }
    );
  }

  const pad = `${datum}/kaart-beeld-${Date.now()}.${ext}`;
  const tipe = ext === "png" ? "image/png" : "image/jpeg";
  const svc = supabaseService();
  const { error } = await svc.storage
    .from("konsep-fotos")
    // Rou Buffer word deur storage as teks gemangel (EF BF BD-korrupsie) —
    // altyd as Blob oplaai.
    .upload(pad, new Blob([new Uint8Array(beeld)], { type: tipe }), { contentType: tipe });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${pad}`,
    wydte,
    hoogte,
    deursigtig,
  });
}
