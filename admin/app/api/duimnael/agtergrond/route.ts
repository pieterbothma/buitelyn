import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { VERSTEK_PROMPT } from "@/lib/duimnael/spec";

export const maxDuration = 120; // beeldgenerering vat 30-60s

/* Genereer 'n duimnael-agtergrond uit AP se verwysingsbeelde.

   /v1/images/generations is TEKS-ALLEEN — dit kan nie verwysings neem nie.
   /v1/images/edits met meervoudige image[]-lêers kan wel, en dit is op
   2026-08-26 teen gpt-image-2 gemeet (HTTP 200, bruikbare plaat).

   Val terug na gpt-image-1 as die nuwer model 4xx gee, presies soos
   app/api/fotos/skep/route.ts. */

const MAKS_BYTES = 15 * 1024 * 1024;
const MAKS_KANT = 1600;
const MAKS_VERWYSINGS = 4;

/** Die model se naaste grootte aan 16:9. Dit word later nie-destruktief na
 *  1280×720 gesny met lib/kaart/beeld.ts se fokus/zoem-wiskunde. */
const GROOTTE = "1536x1024";

function fout(boodskap: string, status: number) {
  return NextResponse.json({ fout: boodskap }, { status });
}

export async function POST(request: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return fout("verbode", 401);

  let vorm: FormData;
  try {
    vorm = await request.formData();
  } catch {
    return fout("ongeldige vorm", 400);
  }

  // Ontbrekende veld = geen keuse gemaak nie -> verstek-prompt. 'n Uitdruklik
  // leë (of net-spasie) prompt is 'n fout — AP het iets probeer tik en gefaal.
  const rouPrompt = vorm.get("prompt");
  const prompt = rouPrompt === null ? VERSTEK_PROMPT : String(rouPrompt).trim();
  if (!prompt) return fout("leë prompt", 400);

  const verwysings = vorm.getAll("verwysing").filter((v): v is File => v instanceof File && v.size > 0);
  if (verwysings.length === 0) return fout("stuur ten minste een verwysingsbeeld", 400);

  for (const v of verwysings) {
    if (v.size > MAKS_BYTES) return fout("Die lêer is groter as 15MB.", 413);
    if (v.type === "image/webp" || v.name.toLowerCase().endsWith(".webp")) {
      return fout("WebP werk nie — stuur PNG of JPEG.", 415);
    }
  }

  if (!process.env.OPENAI_API_KEY) return fout("OPENAI_API_KEY ontbreek", 503);

  /* TWEE STAPPE, en die tweede sien NOOIT die verwysing nie.

     /v1/images/edits is 'n REDIGEER-eindpunt: dit se werk is om die invoerbeeld
     te transformeer. Gee jy dit 'n logo, teken dit daardie logo oor — gemeet op
     2026-08-26 met Naspers se son en die letters "PERS" wat deurgekom het, ten
     spyte van vyf verbods-sinne in die prompt. Dit ignoreer dan ook die
     komposisie-reel, want dit is besig om te kopieer eerder as om te komponeer.

     Ons vra dus eers 'n visie-model WAAROOR die verwysings gaan, in 'n paar
     woorde, en genereer dan met /v1/images/generations — wat geen beeld het om
     te kopieer nie. Kopieer word so struktureel onmoontlik in plaas van
     vriendelik afgeraai. */

  const beelde: string[] = [];
  for (const v of verwysings.slice(0, MAKS_VERWYSINGS)) {
    const rou = Buffer.from(await v.arrayBuffer());
    try {
      const klein = await sharp(rou)
        .rotate()
        .resize(768, 768, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      beelde.push(`data:image/png;base64,${klein.toString("base64")}`);
    } catch {
      return fout(`Kon "${v.name}" nie as beeld lees nie — stuur 'n PNG of JPEG.`, 400);
    }
  }

  let onderwerpe = String(vorm.get("onderwerpe") ?? "").trim();

  /* Het AP self die onderwerpe getik, glo ons hom en slaan die visie-stap oor —
     dis vinniger en akkurater as raai uit 'n logo. */
  if (!onderwerpe) {
    const visieRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Each image below is a reference for a South African business-news episode. " +
                  "For EACH image, name the subject it refers to — the company, industry, sport or topic — " +
                  "in a few words, with a short plain-English gloss of what it is. " +
                  "Do NOT describe colours, layout or design. Answer as one comma-separated line, nothing else.",
              },
              ...beelde.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
        max_completion_tokens: 300,
      }),
    });
    if (!visieRes.ok) {
      return fout(`Kon nie die verwysings lees nie (${visieRes.status}).`, 502);
    }
    const visie = (await visieRes.json()) as { choices?: { message?: { content?: string } }[] };
    onderwerpe = (visie.choices?.[0]?.message?.content ?? "").trim();
  }

  if (!onderwerpe) return fout("Kon nie uitwerk waaroor die verwysings gaan nie.", 502);

  const volledig = `${prompt}\n\nTODAY'S SUBJECTS: ${onderwerpe}. Evoke these subjects ABSTRACTLY as symbols and forms — never draw their actual logos or brand marks.`;

  async function genereer(model: string) {
    return fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, prompt: volledig, size: GROOTTE, quality: "medium" }),
    });
  }

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  let res = await genereer(model);
  if (!res.ok && res.status < 500 && model !== "gpt-image-1") {
    res = await genereer("gpt-image-1");
  }
  if (!res.ok) {
    return fout(`Beeldmodel ${res.status}: ${(await res.text()).slice(0, 200)}`, 502);
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return fout("geen beeld terug nie", 502);

  const beeld = Buffer.from(b64, "base64");
  /* Meet die natuurlike afmetings EEN keer, sodat die snit-wiskunde hulle nie
     by elke render hoef te herbereken nie. */
  const meta = await sharp(beeld).metadata();

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const pad = `${datum}/${Date.now()}.png`;
  const { error } = await supabaseService()
    .storage.from("duimnael")
    .upload(pad, new Blob([new Uint8Array(beeld)], { type: "image/png" }), { contentType: "image/png" });
  if (error) return fout(error.message, 500);

  return NextResponse.json({
    ok: true,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/duimnael/${pad}`,
    wydte: meta.width ?? 1536,
    hoogte: meta.height ?? 1024,
    onderwerpe,
  });
}
