import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { parseerKonsepStories } from "@/lib/konsep-stories";
import { renderKaartPng } from "@/lib/kaart-render";
import { renderKaart } from "@/lib/kaart/render";
import { normaliseerKaart } from "@/lib/kaart/spec";

export const maxDuration = 60;

const SAST_DATUM = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

async function bakEnStoor(png: Buffer, pad: string) {
  const svc = supabaseService();
  const { error } = await svc.storage
    .from("konsep-fotos")
    .upload(pad, new Blob([new Uint8Array(png)], { type: "image/png" }), {
      contentType: "image/png",
    });
  if (error) return { fout: error.message };
  return {
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${pad}`,
  };
}

/* POST = 'n deur die gebruiker saamgestelde kaart.
   Waarom POST en nie navraagparameters soos die grafiek-bouer nie: 'n
   lys-kaart met ses items stoot al teen ~1.5KB se navraagstring, en dit sou
   AP se redaksionele teks in elke toegangslog en blaaiergeskiedenis sit.
   Die GET hieronder bly presies soos hy was vir die outomatiese poskaarte en
   die audiogram-pyplyn. */
export async function POST(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ fout: "verbode" }, { status: 401 });

  let lyf: { kaart?: unknown; datum?: string; skaal?: number; stoor?: boolean };
  try {
    lyf = await request.json();
  } catch {
    return NextResponse.json({ fout: "ongeldige JSON" }, { status: 400 });
  }

  const kaart = normaliseerKaart(lyf.kaart);
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(lyf.datum ?? "") ? lyf.datum! : SAST_DATUM();
  // Voorskou op halfskaal; stoor altyd op vol grootte.
  const skaal = lyf.stoor ? 1 : lyf.skaal && lyf.skaal > 0 && lyf.skaal <= 1 ? lyf.skaal : 1;

  let png: Buffer;
  try {
    png = await renderKaart(kaart, { datum, skaal });
  } catch (e) {
    return NextResponse.json(
      { fout: e instanceof Error ? e.message : "Kon nie render nie" },
      { status: 500 }
    );
  }

  if (lyf.stoor) {
    const res = await bakEnStoor(png, `${datum}/kaart-${Date.now()}.png`);
    if ("fout" in res) return NextResponse.json(res, { status: 500 });
    return NextResponse.json({ ok: true, url: res.url });
  }

  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "private, no-store" },
  });
}

export async function GET(request: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Response("verbode", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const datum =
    sp.get("datum") ??
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const i = Number(sp.get("i") ?? 0);
  const portret = sp.get("vorm") === "portret";

  // Voorkeur: stukke uit die opgelaaide finale nuusbrief; anders konsep-koppe.
  const { data: opgelaai } = await sb
    .from("sosiaal_stukke")
    .select("stukke")
    .eq("datum", datum)
    .maybeSingle();
  let stuk: { kop: string; byskrif: string } | undefined;
  if (opgelaai?.stukke) {
    const s = (opgelaai.stukke as { kop: string; opsomming: string }[])[i];
    if (s) stuk = { kop: s.kop, byskrif: s.opsomming };
  } else {
    const { data: konsep } = await sb
      .from("nuusbrief_konsepte")
      .select("teks")
      .eq("datum", datum)
      .maybeSingle();
    if (konsep?.teks) {
      const k = parseerKonsepStories(konsep.teks)[i];
      if (k) stuk = { kop: k.kop, byskrif: "" }; // konsep-byskrifte is beeld-idees, nie kaartteks nie
    }
  }
  if (!stuk) return new Response("geen storie", { status: 404 });

  const png = await renderKaartPng(stuk, datum, portret);

  /* ?stoor=1 bak die kaart na die PUBLIEKE konsep-fotos-bucket en gee die URL
     terug. Buffer het geen oplaai-eindpunt nie en haal die beeld self van die
     bediener af, so 'n plasing kan NET na 'n publieke URL verwys — hierdie
     roete is dus die brug tussen 'n kaart en 'n geskeduleerde plasing.
     Elke bak skryf 'n nuwe tydstempel-pad: paaie word nooit oorskryf nie,
     want Supabase bedien publieke voorwerpe met 'n max-age en 'n hergebruikte
     URL sou 'n ou beeld aan Buffer gee. */
  if (sp.get("stoor") === "1") {
    const res = await bakEnStoor(png, `${datum}/kaart-${i}-${Date.now()}.png`);
    if ("fout" in res) return NextResponse.json(res, { status: 500 });
    return NextResponse.json({ ok: true, url: res.url, kop: stuk.kop });
  }

  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "private, no-store" },
  });
}
