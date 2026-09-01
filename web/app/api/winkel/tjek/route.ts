import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { valideerBestelling, VERSENDING_SENT } from "@/lib/winkel/valideer";
import { beginTransaksie, toetsModus } from "@/lib/winkel/paystack";

export const runtime = "nodejs";

/* Skep die bestelling (status: begin) en stuur die koper na Paystack.
   Voorraad word HIER gekontroleer (eerlike "uitverkoop") maar eers by
   BETALING afgetrek — 'n verlate vorm mag nooit 'n pet vashou nie. */
export async function POST(request: NextRequest) {
  let liggaam: Record<string, unknown>;
  try { liggaam = await request.json(); } catch {
    return NextResponse.json({ fout: "Ongeldige versoek." }, { status: 400 });
  }
  /* Heuningpot — selfde patroon as die nuusbrief-roete. */
  if (typeof liggaam.webwerf === "string" && liggaam.webwerf.trim() !== "")
    return NextResponse.json({ ok: true });

  const v = valideerBestelling(liggaam);
  if (!v.ok) return NextResponse.json({ fout: v.fout }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sleutel) return NextResponse.json({ fout: "Die winkel is nou nie beskikbaar nie." }, { status: 503 });
  const sb = createClient(url, sleutel);

  const { data: variant } = await sb.from("winkel_variante")
    .select("id, kleur, voorraad, winkel_produkte(naam, prys_sent, aktief)")
    .eq("id", v.data.variantId).single();
  const produk = (variant as { winkel_produkte?: { naam: string; prys_sent: number; aktief: boolean } } | null)?.winkel_produkte;
  if (!variant || !produk?.aktief)
    return NextResponse.json({ fout: "Daardie produk is nie beskikbaar nie." }, { status: 404 });
  if (variant.voorraad < v.data.aantal)
    return NextResponse.json({ fout: variant.voorraad === 0
      ? `${variant.kleur} is uitverkoop.` : `Net ${variant.voorraad} oor in ${variant.kleur}.` }, { status: 409 });

  const itemSent = produk.prys_sent * v.data.aantal;
  const totaalSent = itemSent + VERSENDING_SENT;
  const verwysing = `BL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { error } = await sb.from("winkel_bestellings").insert({
    verwysing, status: "begin", modus: toetsModus() ? "toets" : "regte",
    variant_id: variant.id,
    item: { naam: produk.naam, kleur: variant.kleur, prys_sent: produk.prys_sent, aantal: v.data.aantal },
    koper: v.data.koper, adres: v.data.adres,
    item_sent: itemSent, versending_sent: VERSENDING_SENT, totaal_sent: totaalSent,
  });
  if (error) return NextResponse.json({ fout: "Kon nie die bestelling skep nie." }, { status: 500 });

  try {
    /* callback_url uit die versoek se oorsprong: op die voorskou is dit die
       voorskou-URL, in produksie buitelyn.com — geen env-geskarrel nie. */
    const oorsprong = new URL(request.url).origin;
    const betaalUrl = await beginTransaksie({
      epos: v.data.koper.epos, bedragSent: totaalSent, verwysing,
      callbackUrl: `${oorsprong}/winkel/bevestig?verwysing=${verwysing}`,
    });
    return NextResponse.json({ url: betaalUrl });
  } catch (e) {
    console.error("winkel: initialize het misluk", e);
    return NextResponse.json({ fout: "Betaling kon nie begin nie. Probeer weer." }, { status: 502 });
  }
}
