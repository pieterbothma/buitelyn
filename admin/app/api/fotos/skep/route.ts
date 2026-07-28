import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const maxDuration = 120; // beeldgenerering vat 30-60s

/* Genereer 'n nuusbrief-beeld met OpenAI se beeldmodel en stoor dit in die
   konsep-fotos-bucket. Val terug na gpt-image-1 as die nuwer model 4xx gee. */
async function genereer(model: string, prompt: string) {
  return fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, prompt, size: "1536x1024", quality: "medium" }),
  });
}

export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  const { prompt } = (await request.json()) as { prompt?: string };
  if (!prompt?.trim()) return NextResponse.json({ fout: "leë prompt" }, { status: 400 });

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  let res = await genereer(model, prompt.trim());
  if (!res.ok && res.status < 500 && model !== "gpt-image-1") {
    res = await genereer("gpt-image-1", prompt.trim());
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

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date()
  );
  const pad = `${datum}/${Date.now()}.png`;
  const svc = supabaseService();
  const { error } = await svc.storage
    .from("konsep-fotos")
    .upload(pad, Buffer.from(b64, "base64"), { contentType: "image/png" });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${pad}`;
  return NextResponse.json({ ok: true, url });
}
