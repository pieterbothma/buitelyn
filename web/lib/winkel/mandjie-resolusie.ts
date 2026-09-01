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

/** `gereed` laat die aanroeper (mandjie-lys/betaalvorm) hierdie hoek eers
 *  laat loop SODRA useMandjie() self klaar ingelaai het — anders resolveer
 *  ids=[] (die altyd-leë eerste render, sien useMandjie se hidrasie-nota)
 *  onmiddellik na gelaai=true, en elke regte lyn flits een raam lank as
 *  "Nie meer beskikbaar nie" voordat die ware mandjie inkom. */
export function useMandjieResolusie(ids: string[], gereed: boolean = true) {
  const idsSleutel = ids.slice().sort().join(",");
  const [variante, setVariante] = useState<Record<string, MandjieVariantRy>>({});
  const [gelaai, setGelaai] = useState(false);
  const [fout, setFout] = useState(false);

  useEffect(() => {
    if (!gereed) return; // wag vir useMandjie() se eie inlaai — sien nota hierbo
    let ongedaan = false;
    if (!idsSleutel) {
      setVariante({});
      setFout(false);
      setGelaai(true);
      return;
    }
    setGelaai(false);
    setFout(false);
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from("winkel_variante")
      .select("id, kleur, grootte, voorraad, aktief, winkel_produkte(naam, prys_sent, fotos, aktief)")
      .in("id", idsSleutel.split(","))
      .then(({ data, error }) => {
        if (ongedaan) return;
        if (error) {
          /* 'n Netwerk-/RLS-fout hier moet NOOIT soos "elke lyn is skielik
             weg" lyk nie — dis 'n heel ander (en eerliker) boodskap. */
          console.error("winkel: kon nie mandjie-variante laai nie", error);
          setFout(true);
          setGelaai(true);
          return;
        }
        const kaart: Record<string, MandjieVariantRy> = {};
        for (const rij of (data ?? []) as unknown as MandjieVariantRy[]) kaart[rij.id] = rij;
        setVariante(kaart);
        setGelaai(true);
      });
    return () => {
      ongedaan = true;
    };
    // idsSleutel is die stabiele, gesorteerde vorm van ids — dis al wat
    // hierdie effek moet laat herloop, plus gereed self.
  }, [idsSleutel, gereed]);

  return { variante, gelaai, fout };
}

export type MandjieLyn = {
  variantId: string;
  aantal: number;
  /** "beskikbaar": voorraad > 0, koopbaar (moontlik afgeklem, sien kortVoorraad).
   *  "uitverkoop": die variant/produk bestaan nog en is aktief, maar voorraad === 0.
   *  "onbeskikbaar": die variant of produk het verdwyn of is onaktief geraak. */
  status: "beskikbaar" | "uitverkoop" | "onbeskikbaar";
  naam?: string;
  kleur?: string;
  grootte?: string | null;
  prysSent?: number;
  foto?: string;
  voorraad?: number;
  kortVoorraad?: boolean;
};

/** Suiwer: bou lees-klare lyne + totale uit die ruwe mandjie-items en die
 *  opgeloste variant-kaart. "onbeskikbaar" en "uitverkoop" is doelbewus
 *  onderskeie state — 'n verdwene variant ("Nie meer beskikbaar nie") en 'n
 *  bestaande-maar-leë variant ("Uitverkoop") is nie dieselfde storie vir die
 *  koper nie. Slegs "beskikbaar"-lyne tel na "Gaan betaal". */
export function mandjieOpsomming(items: MandjieItem[], variante: Record<string, MandjieVariantRy>) {
  const lyne: MandjieLyn[] = items.map((it) => {
    const v = variante[it.variantId];
    const bestaanNog = !!(v && v.aktief && v.winkel_produkte?.aktief);
    if (!bestaanNog) return { variantId: it.variantId, aantal: it.aantal, status: "onbeskikbaar" as const };
    const produk = v.winkel_produkte!;
    const fotos = Array.isArray(produk.fotos) ? (produk.fotos as string[]) : [];
    const basis = {
      variantId: it.variantId,
      aantal: it.aantal,
      naam: produk.naam,
      kleur: v.kleur,
      grootte: v.grootte,
      prysSent: produk.prys_sent,
      foto: fotos[0],
      voorraad: v.voorraad,
    };
    if (v.voorraad === 0) return { ...basis, status: "uitverkoop" as const };
    return { ...basis, status: "beskikbaar" as const, kortVoorraad: v.voorraad < it.aantal };
  });
  const itemSent = lyne.reduce((som, l) => som + (l.status === "beskikbaar" ? (l.prysSent ?? 0) * l.aantal : 0), 0);
  const alleBeskikbaar = lyne.length > 0 && lyne.every((l) => l.status === "beskikbaar");
  return { lyne, itemSent, alleBeskikbaar };
}
