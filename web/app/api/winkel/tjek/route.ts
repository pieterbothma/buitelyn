import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { valideerBestelling, VERSENDING_SENT } from "@/lib/winkel/valideer";
import type { BestelLyn } from "@/lib/winkel/epos";
import { beginTransaksie, toetsModus } from "@/lib/winkel/paystack";

export const runtime = "nodejs";

type VarianteRy = {
  id: string; kleur: string; grootte: string | null; voorraad: number; aktief: boolean;
  winkel_produkte?: { naam: string; prys_sent: number; aktief: boolean } | null;
};

/* Skep die bestelling (status: begin) en stuur die koper na Paystack.
   Voorraad word HIER gekontroleer (eerlike "uitverkoop") maar eers by
   BETALING afgetrek — 'n verlate vorm mag nooit 'n mandjie vashou nie. */
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

  /* Al die mandjie se lyne in EEN bevraging — nie N+1 nie. */
  const ids = v.data.items.map((i) => i.variantId);
  const { data: varianteRou } = await sb.from("winkel_variante")
    .select("id, kleur, grootte, voorraad, aktief, winkel_produkte(naam, prys_sent, aktief)")
    .in("id", ids);
  const variante = (varianteRou ?? []) as unknown as VarianteRy[];
  const deurId = new Map(variante.map((rij) => [rij.id, rij]));

  const items: BestelLyn[] = [];
  for (const lyn of v.data.items) {
    const variant = deurId.get(lyn.variantId);
    const produk = variant?.winkel_produkte;
    /* 'n Onaktiewe variant is net so onbeskikbaar as 'n onaktiewe produk. */
    if (!variant || !variant.aktief || !produk?.aktief)
      return NextResponse.json({ fout: "Daardie produk is nie beskikbaar nie.", variantId: lyn.variantId }, { status: 404 });
    if (variant.voorraad < lyn.aantal)
      return NextResponse.json({
        fout: variant.voorraad === 0
          ? `${produk.naam} (${variant.kleur}${variant.grootte ? `, ${variant.grootte}` : ""}) is uitverkoop.`
          : `Net ${variant.voorraad} oor van ${produk.naam} (${variant.kleur}${variant.grootte ? `, ${variant.grootte}` : ""}).`,
        variantId: lyn.variantId,
      }, { status: 409 });
    items.push({
      variant_id: variant.id, naam: produk.naam, kleur: variant.kleur, grootte: variant.grootte,
      prys_sent: produk.prys_sent, aantal: lyn.aantal,
    });
  }

  const itemSent = items.reduce((som, l) => som + l.prys_sent * l.aantal, 0);
  const totaalSent = itemSent + VERSENDING_SENT;
  const verwysing = `BL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { error } = await sb.from("winkel_bestellings").insert({
    verwysing, status: "begin", modus: toetsModus() ? "toets" : "regte",
    items,
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
