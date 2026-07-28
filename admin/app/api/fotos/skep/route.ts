import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import path from "node:path";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

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

  const { prompt, size, logo } = (await request.json()) as {
    prompt?: string;
    size?: string;
    logo?: "ink" | "wit" | "geen";
  };
  if (!prompt?.trim()) return NextResponse.json({ fout: "leë prompt" }, { status: 400 });
  const grootte = GROOTTES.has(size ?? "") ? size! : "1536x1024";

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  let res = await genereer(model, prompt.trim(), grootte);
  if (!res.ok && res.status < 500 && model !== "gpt-image-1") {
    res = await genereer("gpt-image-1", prompt.trim(), grootte);
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

  // Buitelyn-logo outomaties in die hoek (regs onder), ink of wit
  let beeld = Buffer.from(b64, "base64");
  if (logo === "ink" || logo === "wit") {
    const [wydte] = grootte.split("x").map(Number);
    const logoGrootte = Math.round(wydte * 0.12);
    const rand = Math.round(wydte * 0.03);
    const logoPng = await sharp(path.join(process.cwd(), `assets/logo-${logo}.png`))
      .resize(logoGrootte, logoGrootte)
      .png()
      .toBuffer();
    beeld = await sharp(beeld)
      .composite([{ input: logoPng, gravity: "southeast", top: undefined, left: undefined }])
      .png()
      .toBuffer();
    // gravity southeast sit dit teen die rand — skuif effens in met 'n rand-buffer
    const meta = await sharp(Buffer.from(b64, "base64")).metadata();
    beeld = await sharp(Buffer.from(b64, "base64"))
      .composite([
        {
          input: logoPng,
          top: (meta.height ?? 1024) - logoGrootte - rand,
          left: (meta.width ?? 1024) - logoGrootte - rand,
        },
      ])
      .png()
      .toBuffer();
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
