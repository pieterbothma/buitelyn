import { NextResponse, type NextRequest } from "next/server";
import sharp, { type OverlayOptions } from "sharp";
import path from "node:path";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { renderOpskrifPng } from "@/lib/kaart-render";

export const maxDuration = 120; // beeldgenerering vat 30-60s

/* Genereer 'n nuusbrief-beeld met OpenAI se beeldmodel en stoor dit in die
   konsep-fotos-bucket. Val terug na gpt-image-1 as die nuwer model 4xx gee. */
const GROOTTES = new Set(["1536x1024", "1024x1024", "1024x1536"]);

async function genereer(model: string, prompt: string, size: string) {
  return fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, prompt, size, quality: "medium" }),
  });
}

export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const { prompt, size, logo, opskrif } = (await request.json()) as {
    prompt?: string;
    size?: string;
    logo?: "ink" | "wit" | "geen";
    opskrif?: string; // teenwoordig = spotprent-modus (eie kaart)
  };
  if (!prompt?.trim()) return NextResponse.json({ fout: "leë prompt" }, { status: 400 });
  const grootte = GROOTTES.has(size ?? "") ? size! : "1536x1024";

  /* Eie kaart = Buitelyn-spotprent: swart opskrif bo, spotprent daaronder,
     papier/ink/rooi-palet. Foto Idees stuur volledige prompts sonder dié
     sleutel en bly onaangeraak. */
  /* Die AI teken NET die kuns; ons sit self die tipografie op: die prompt
     reserveer 'n skoon boonste band (vir die opskrif in League Spartan) en
     'n leë regs-onder-hoek (vir die logo). */
  const finalePrompt =
    opskrif !== undefined
      ? `Single-panel editorial cartoon for a South African financial publication: a witty, clever scene of ${prompt.trim()}. STYLE — authentic 1950s mid-century commercial book illustration, like vintage screenprint/lithograph spot art: a strictly limited TWO-COLOUR palette of black plus ONE muted accent (either dusty rose-mauve or sage-teal) printed as flat shapes on cream/off-white textured paper (#F7F6F2); loose, confident ink-brush linework; charmingly elongated, expressive characters with skinny limbs and big noses; flat colour fills with the paper showing through as negative-space highlights; slight print misregistration charm; absolutely NO gradients, NO shading, NO photorealism, NO digital smoothness. IMPORTANT composition constraints: keep the top 18% of the image completely empty plain paper background (headline space will be added later); keep the bottom-right corner (roughly 18% width, 12% height) empty plain paper (logo space). Absolutely no text, lettering, captions, watermarks or logos anywhere in the image.`
      : prompt.trim();

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  let res = await genereer(model, finalePrompt, grootte);
  if (!res.ok && res.status < 500 && model !== "gpt-image-1") {
    res = await genereer("gpt-image-1", finalePrompt, grootte);
  }
  if (!res.ok) {
    return NextResponse.json(
      { fout: `Beeldmodel ${res.status}: ${(await res.text()).slice(0, 200)}` },
      { status: 502 }
    );
  }
  const data = await res.json();
  const b64: string | undefined = data?.data?.[0]?.b64_json;
  if (!b64) return NextResponse.json({ fout: "geen beeld terug nie" }, { status: 502 });

  // Composiet in een pas: opskrif in ons font in die boonste band + logo regs onder
  /* Uitdruklik Buffer (dus Buffer<ArrayBufferLike>): sharp se toBuffer() gee
     dié wyer tipe terug, terwyl Buffer.from() na Buffer<ArrayBuffer> vernou.
     Sonder die annotasie weier die hertoekenning hier onder. */
  let beeld: Buffer = Buffer.from(b64, "base64");
  const [wydte, hoogte] = grootte.split("x").map(Number);
  const lae: OverlayOptions[] = [];
  if (opskrif !== undefined && opskrif.trim()) {
    const bandHoogte = Math.round(hoogte * 0.16);
    const opskrifPng = await renderOpskrifPng(opskrif.trim(), wydte, bandHoogte);
    lae.push({ input: opskrifPng, top: Math.round(hoogte * 0.015), left: 0 });
  }
  if (logo === "ink" || logo === "wit") {
    const logoGrootte = Math.round(wydte * 0.12);
    const rand = Math.round(wydte * 0.03);
    const logoPng = await sharp(path.join(process.cwd(), `assets/logo-${logo}.png`))
      .resize(logoGrootte, logoGrootte)
      .png()
      .toBuffer();
    lae.push({ input: logoPng, top: hoogte - logoGrootte - rand, left: wydte - logoGrootte - rand });
  }
  if (lae.length) {
    beeld = await sharp(beeld).composite(lae).png().toBuffer();
  }

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date()
  );
  const pad = `${datum}/${Date.now()}.png`;
  const svc = supabaseService();
  const { error } = await svc.storage
    .from("konsep-fotos")
    .upload(pad, new Blob([new Uint8Array(beeld)], { type: "image/png" }), {
      contentType: "image/png",
    });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${pad}`;
  return NextResponse.json({ ok: true, url });
}
