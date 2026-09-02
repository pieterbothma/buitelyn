"use client";

/* Mandjie-kern: suiwer helpers (geen DOM-toegang nie, so vitest se node-
   omgewing kan hulle sonder jsdom toets) plus die useMandjie-hoek wat die
   lys in localStorage laat woon.

   Die hoek lees uit ÉÉN gedeelde module-vlak stoor (nie per-instansie state
   nie) via useSyncExternalStore, sodat Koopkaart se voegBy en die
   MandjieKenteken-oortjie in dieselfde blad-instansie altyd dieselfde lys
   sien — en elke mutasie skryf SINKROON na localStorage in dieselfde oproep
   (geen aparte write-through-effek wat 'n oomblik agterloop nie). Die
   kruis-oortjie storage-luisteraar registreer net een keer, op die eerste
   subscribe. Die hoek raak localStorage/window net in lasy-init/effekte
   aan, en altyd in try/catch — 'n privaat-blaaiervenster of SSR mag dit
   weier. */

import { useCallback, useSyncExternalStore } from "react";

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

/* --- Gedeelde module-vlak stoor ------------------------------------- */

// Stabiele leë-lys-konstante: die bediener-passie EN die eerste kliënt-
// snapshot (voor die stoor geïnisialiseer is) gee altyd DIESELFDE
// verwysing terug, sodat hidrasie nooit 'n verskil sien nie.
const LEEG: MandjieItem[] = [];

// null = die stoor het nog nie uit localStorage gelaai nie.
let stoorItems: MandjieItem[] | null = null;
let stoorGeinisialiseer = false;
const luisteraars = new Set<() => void>();

function kennisGee() {
  for (const luister of luisteraars) luister();
}

function inisialiseerStoorIndienNodig() {
  if (stoorItems !== null) return;
  try {
    stoorItems = laaiUitStoor();
  } catch {
    stoorItems = [];
  }
}

function opStoorVerandering(e: StorageEvent) {
  if (e.key !== SLEUTEL) return;
  try {
    stoorItems = laaiUitStoor();
  } catch {
    stoorItems = [];
  }
  kennisGee();
}

function subscribe(luister: () => void): () => void {
  luisteraars.add(luister);
  if (!stoorGeinisialiseer) {
    stoorGeinisialiseer = true;
    inisialiseerStoorIndienNodig();
    try {
      window.addEventListener("storage", opStoorVerandering);
    } catch {
      // sien laaiUitStoor — 'n privaat-venster mag dit weier
    }
    // Stel elke reeds-ingeskrewe luisteraar (insluitend hierdie een) in
    // kennis dat die stoor nou gelaai is — React se eie useSyncExternalStore-
    // snapshot-kontrole vang dit ook op elke commit, maar hierdie roep dit
    // dadelik aan sodat die eerste render ná montering nie op 'n toevallige
    // volgende hersroei hoef te wag nie.
    kennisGee();
  }
  return () => {
    luisteraars.delete(luister);
  };
}

function getSnapshot(): MandjieItem[] {
  return stoorItems ?? LEEG;
}

function getServerSnapshot(): MandjieItem[] {
  return LEEG;
}

function pasStoorAan(wysig: (huidig: MandjieItem[]) => MandjieItem[]) {
  inisialiseerStoorIndienNodig();
  const nuwe = wysig(stoorItems ?? []);
  stoorItems = nuwe;
  skryfNaStoor(nuwe);
  kennisGee();
}

export function useMandjie() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Dieselfde snapshot-verwysing dryf items EN gelaai — sodra die stoor
  // gelaai het, is stoorItems (en dus items) nooit meer die LEEG-konstante
  // nie, al is die werklike mandjie leeg.
  const gelaai = items !== LEEG;

  const voegByFn = useCallback((variantId: string, aantal: number) => {
    pasStoorAan((huidig) => voegBy(huidig, variantId, aantal));
  }, []);

  const verwyderFn = useCallback((variantId: string) => {
    pasStoorAan((huidig) => verwyder(huidig, variantId));
  }, []);

  const stelAantalFn = useCallback((variantId: string, aantal: number) => {
    pasStoorAan((huidig) => stelAantal(huidig, variantId, aantal));
  }, []);

  const maakLeeg = useCallback(() => {
    pasStoorAan(() => []);
  }, []);

  return { items, gelaai, voegBy: voegByFn, verwyder: verwyderFn, stelAantal: stelAantalFn, maakLeeg };
}
