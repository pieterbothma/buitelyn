"use client";

/* Los die mandjie se variantId's op na lewende DB-data — EEN anon-bevraging
   (winkel_variante + winkel_produkte-samevoeging is publiek leesbaar via
   RLS). Gedeel tussen mandjie-lys en betaalvorm sodat albei presies
   dieselfde "is dit nog beskikbaar?"-logika en totale gebruik. */

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { MandjieItem } from "./mandjie";

export type MandjieVariantRy = {
  id: string;
  kleur: string;
  grootte: string | null;
  voorraad: number;
  aktief: boolean;
  winkel_produkte: { naam: string; prys_sent: number; fotos: unknown; aktief: boolean } | null;
};

export function useMandjieResolusie(ids: string[]) {
  const idsSleutel = ids.slice().sort().join(",");
  const [variante, setVariante] = useState<Record<string, MandjieVariantRy>>({});
  const [gelaai, setGelaai] = useState(false);

  useEffect(() => {
    let ongedaan = false;
    if (!idsSleutel) {
      setVariante({});
      setGelaai(true);
      return;
    }
    setGelaai(false);
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from("winkel_variante")
      .select("id, kleur, grootte, voorraad, aktief, winkel_produkte(naam, prys_sent, fotos, aktief)")
      .in("id", idsSleutel.split(","))
      .then(({ data }) => {
        if (ongedaan) return;
        const kaart: Record<string, MandjieVariantRy> = {};
        for (const rij of (data ?? []) as unknown as MandjieVariantRy[]) kaart[rij.id] = rij;
        setVariante(kaart);
        setGelaai(true);
      });
    return () => {
      ongedaan = true;
    };
    // idsSleutel is die stabiele, gesorteerde vorm van ids — dis al wat
    // hierdie effek moet laat herloop.
  }, [idsSleutel]);

  return { variante, gelaai };
}

export type MandjieLyn = {
  variantId: string;
  aantal: number;
  beskikbaar: boolean;
  naam?: string;
  kleur?: string;
  grootte?: string | null;
  prysSent?: number;
  foto?: string;
  voorraad?: number;
  kortVoorraad?: boolean;
};

/** Suiwer: bou lees-klare lyne + totale uit die ruwe mandjie-items en die
 *  opgeloste variant-kaart. 'n Lyn wie se variant verdwyn of onaktief geraak
 *  het (produk of variant) is "nie meer beskikbaar nie". */
export function mandjieOpsomming(items: MandjieItem[], variante: Record<string, MandjieVariantRy>) {
  const lyne: MandjieLyn[] = items.map((it) => {
    const v = variante[it.variantId];
    const beskikbaar = !!(v && v.aktief && v.winkel_produkte?.aktief);
    if (!beskikbaar) return { variantId: it.variantId, aantal: it.aantal, beskikbaar: false };
    const produk = v.winkel_produkte!;
    const fotos = Array.isArray(produk.fotos) ? (produk.fotos as string[]) : [];
    return {
      variantId: it.variantId,
      aantal: it.aantal,
      beskikbaar: true,
      naam: produk.naam,
      kleur: v.kleur,
      grootte: v.grootte,
      prysSent: produk.prys_sent,
      foto: fotos[0],
      voorraad: v.voorraad,
      kortVoorraad: v.voorraad < it.aantal,
    };
  });
  const itemSent = lyne.reduce((som, l) => som + (l.beskikbaar ? (l.prysSent ?? 0) * l.aantal : 0), 0);
  const alleBeskikbaar = lyne.length > 0 && lyne.every((l) => l.beskikbaar);
  return { lyne, itemSent, alleBeskikbaar };
}
