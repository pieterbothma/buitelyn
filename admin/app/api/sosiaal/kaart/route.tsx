import { type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { parseerKonsepStories } from "@/lib/konsep-stories";
import { renderKaartPng } from "@/lib/kaart-render";

export const maxDuration = 60;

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
  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "private, no-store" },
  });
}
