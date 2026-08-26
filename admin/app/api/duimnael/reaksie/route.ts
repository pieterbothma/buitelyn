import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { replicateConfigured, verwyderAgtergrondReplicate } from "@/lib/replicate";

export const maxDuration = 120;

/* Die reaksie-biblioteek. 'n Nuwe skoot kom as 'n gewone foto in; ons sny die
   agtergrond uit en stoor 'n DEURSIGTIGE PNG, want die uitknipsel word later
   bo-op 'n KI-agtergrond gecomposiet.

   Replicate neem 'n URL, nie grepe nie, en sy uitset-URL is TYDELIK
   (replicate.delivery hou dit ongeveer 'n uur). Ons laai die rou beeld dus
   eers op om 'n URL te kry, sny, herhuisves die uitset dadelik, en vee die
   tydelike rou beeld weer uit. */

const MAKS_BYTES = 15 * 1024 * 1024;
const MAKS_KANT = 1600;
const EMMER = "duimnael-reaksies";

function fout(boodskap: string, status: number) {
  return NextResponse.json({ fout: boodskap }, { status });
}

async function sessie() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  if (!(await sessie())) return fout("verbode", 401);

  let vorm: FormData;
  try {
    vorm = await request.formData();
  } catch {
    return fout("ongeldige vorm", 400);
  }

  const leer = vorm.get("leer");
  if (!(leer instanceof File) || leer.size === 0) return fout("geen lêer nie", 400);
  if (leer.size > MAKS_BYTES) return fout("Die lêer is groter as 15MB.", 413);
  if (leer.type === "image/webp" || leer.name.toLowerCase().endsWith(".webp")) {
    return fout("WebP werk nie — stuur PNG of JPEG.", 415);
  }
  if (!replicateConfigured()) return fout("REPLICATE_API_TOKEN ontbreek", 503);

  const svc = supabaseService();
  const basis = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EMMER}`;
  const rouPad = `rou/${Date.now()}.png`;

  try {
    // 1 — normaliseer en laai op sodat Replicate 'n URL het om te haal.
    const rou = Buffer.from(await leer.arrayBuffer());
    let genormaliseer: Buffer;
    try {
      genormaliseer = await sharp(rou)
        .rotate()
        .resize(MAKS_KANT, MAKS_KANT, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
    } catch {
      /* Sien die agtergrond-roete: 'n beeld wat sharp nie kan lees nie, gaan nie
         rou deur nie. */
      return fout("Kon die lêer nie as beeld lees nie — stuur 'n PNG of JPEG.", 400);
    }
    // Rou Buffer word deur storage as teks gemangel — altyd as Blob.
    const opgelaai = await svc.storage
      .from(EMMER)
      .upload(rouPad, new Blob([new Uint8Array(genormaliseer)], { type: "image/png" }), {
        contentType: "image/png",
      });
    if (opgelaai.error) return fout(opgelaai.error.message, 500);

    // 2 — sny die agtergrond uit.
    const uitsetUrl = await verwyderAgtergrondReplicate(`${basis}/${rouPad}`);

    // 3 — Replicate se URL verval; haal die grepe dadelik.
    const haal = await fetch(uitsetUrl, { signal: AbortSignal.timeout(60_000) });
    if (!haal.ok) throw new Error(`Kon nie die uitset aflaai nie (${haal.status})`);
    const uitgesnyRou = Buffer.from(await haal.arrayBuffer());

    // 4 — herhuisves as 'n deursigtige PNG.
    const beeld = await sharp(uitgesnyRou)
      .resize({ width: MAKS_KANT, height: MAKS_KANT, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const meta = await sharp(beeld).metadata();

    const naam = `${Date.now()}.png`;
    const { error } = await svc.storage
      .from(EMMER)
      .upload(naam, new Blob([new Uint8Array(beeld)], { type: "image/png" }), {
        contentType: "image/png",
      });
    if (error) return fout(error.message, 500);

    // 5 — die rou beeld was net 'n hysbak vir Replicate.
    await svc.storage.from(EMMER).remove([rouPad]);

    return NextResponse.json({
      ok: true,
      naam,
      url: `${basis}/${naam}`,
      wydte: meta.width ?? 0,
      hoogte: meta.height ?? 0,
    });
  } catch (e) {
    await svc.storage.from(EMMER).remove([rouPad]);
    return fout(e instanceof Error ? e.message : "Kon nie die agtergrond verwyder nie", 502);
  }
}

export async function DELETE(request: Request) {
  if (!(await sessie())) return fout("verbode", 401);

  const naam = new URL(request.url).searchParams.get("naam") ?? "";
  /* Geen padskeiers nie: 'n naam soos "../ander/x.png" sou uit die emmer
     ontsnap en 'n ander bucket se lêer kon tref. */
  if (!naam || naam.includes("/") || naam.includes("\\") || naam.includes("..")) {
    return fout("ongeldige naam", 400);
  }

  const { error } = await supabaseService().storage.from(EMMER).remove([naam]);
  if (error) return fout(error.message, 500);
  return NextResponse.json({ ok: true });
}
