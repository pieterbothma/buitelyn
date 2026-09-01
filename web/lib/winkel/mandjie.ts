"use client";

/* Mandjie-kern: suiwer helpers (geen DOM-toegang nie, so vitest se node-
   omgewing kan hulle sonder jsdom toets) plus die useMandjie-hoek wat die
   lys in localStorage laat woon. Die hoek raak localStorage/window net in
   lasy-init/effekte aan, en altyd in try/catch — 'n privaat-blaaiervenster
   of SSR mag dit weier. */

import { useCallback, useEffect, useState } from "react";

export type MandjieItem = { variantId: string; aantal: number };

const SLEUTEL = "winkel-mandjie";
const MAKS_AANTAL = 5;

const klem = (aantal: number) => Math.max(1, Math.min(MAKS_AANTAL, Math.round(aantal)));

/** Voeg 'n variant by, of smelt saam met 'n bestaande lyn — geklem op 1..5. */
export function voegBy(lys: MandjieItem[], variantId: string, aantal: number): MandjieItem[] {
  const bestaande = lys.find((l) => l.variantId === variantId);
  if (bestaande) {
    return lys.map((l) =>
      l.variantId === variantId ? { ...l, aantal: klem(l.aantal + aantal) } : l,
    );
  }
  return [...lys, { variantId, aantal: klem(aantal) }];
}

/** Verwyder 'n variant heeltemal uit die mandjie. */
export function verwyder(lys: MandjieItem[], variantId: string): MandjieItem[] {
  return lys.filter((l) => l.variantId !== variantId);
}

/** Stel die aantal vir 'n variant — 0 (of minder) verwyder die lyn. */
export function stelAantal(lys: MandjieItem[], variantId: string, aantal: number): MandjieItem[] {
  if (aantal <= 0) return verwyder(lys, variantId);
  const bestaande = lys.find((l) => l.variantId === variantId);
  if (!bestaande) return lys;
  return lys.map((l) => (l.variantId === variantId ? { ...l, aantal: klem(aantal) } : l));
}

/** Totale aantal items in die mandjie (som van aantalle, nie aantal lyne nie). */
export function telling(lys: MandjieItem[]): number {
  return lys.reduce((som, l) => som + l.aantal, 0);
}

function laaiUitStoor(): MandjieItem[] {
  try {
    const rou = window.localStorage.getItem(SLEUTEL);
    if (!rou) return [];
    const ontleed = JSON.parse(rou);
    if (!Array.isArray(ontleed)) return [];
    return ontleed;
  } catch {
    return [];
  }
}

function skryfNaStoor(items: MandjieItem[]) {
  try {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(items));
  } catch {
    // Privaat-venster of quota vol — mandjie bly net in geheue.
  }
}

export function useMandjie() {
  const [items, setItems] = useState<MandjieItem[]>(() => {
    try {
      return laaiUitStoor();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      skryfNaStoor(items);
    } catch {
      // sien skryfNaStoor
    }
  }, [items]);

  useEffect(() => {
    function opStoorVerandering(e: StorageEvent) {
      if (e.key !== SLEUTEL) return;
      try {
        setItems(laaiUitStoor());
      } catch {
        setItems([]);
      }
    }
    try {
      window.addEventListener("storage", opStoorVerandering);
      return () => window.removeEventListener("storage", opStoorVerandering);
    } catch {
      return undefined;
    }
  }, []);

  const voegByFn = useCallback((variantId: string, aantal: number) => {
    setItems((huidig) => voegBy(huidig, variantId, aantal));
  }, []);

  const verwyderFn = useCallback((variantId: string) => {
    setItems((huidig) => verwyder(huidig, variantId));
  }, []);

  const stelAantalFn = useCallback((variantId: string, aantal: number) => {
    setItems((huidig) => stelAantal(huidig, variantId, aantal));
  }, []);

  const maakLeeg = useCallback(() => {
    setItems([]);
  }, []);

  return { items, voegBy: voegByFn, verwyder: verwyderFn, stelAantal: stelAantalFn, maakLeeg };
}
