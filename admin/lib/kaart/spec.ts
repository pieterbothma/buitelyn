/* Die kaart-spesifikasie: tipes, afmetings en normalisering.

   KLIËNT-VEILIG — geen JSX, geen next/og. Die redigeerder (client component)
   voer hierdie lêer en register.ts in; die renderaars in render.tsx en
   styles/* is BEDIENER-ALLEEN. Word daardie invoer, sleep satori + resvg +
   yoga.wasm die blaaier-bundel in, en die bou slaag stilweg. */

import type { Vel } from "./tokens";

export type Vorm = "vierkant" | "portret" | "storie" | "landskap";

export const AFMETINGS: Record<Vorm, { w: number; h: number }> = {
  vierkant: { w: 1080, h: 1080 },
  portret: { w: 1080, h: 1350 },
  storie: { w: 1080, h: 1920 },
  landskap: { w: 1200, h: 630 },
};

export const VORM_NAAM: Record<Vorm, string> = {
  vierkant: "Vierkant (1:1)",
  portret: "Portret (4:5)",
  storie: "Storie (9:16)",
  landskap: "Landskap (1.91:1)",
};

/** Watter vorms 'n platform aanvaar. Instagram se voer neem 4:5 tot 1.91:1,
 *  so 'n 9:16-kaart hoort net in stories/reels — ons weier dit vooraf eerder
 *  as om Buffer dit later te laat verwerp. */
export const PLATFORM_VORMS: Record<Vorm, string[]> = {
  vierkant: ["instagram", "facebook", "linkedin", "twitter", "threads", "bluesky", "mastodon"],
  portret: ["instagram", "facebook", "linkedin", "twitter", "threads", "bluesky", "mastodon"],
  storie: ["instagram", "facebook", "tiktok"],
  landskap: ["linkedin", "twitter", "facebook", "threads", "bluesky", "mastodon"],
};

/** Nie-destruktiewe beeldsnit. Die URL bly onaangeraak; die snit is data, so
 *  'n kaart kan weke later herrender word — selfs in 'n ander vorm — met die
 *  fokuspunt behoue. */
export type BeeldBron = {
  /** Publieke URL. NOOIT 'n data:-URL nie (sien normaliseerBeeld). */
  url: string;
  /** Natuurlike afmetings, nodig vir die snit-wiskunde. */
  wydte: number;
  hoogte: number;
  /** 0..1 — waar in die beeld die gleuf gesentreer word. */
  fokusX: number;
  fokusY: number;
  /** 1 = presies "cover"; groter zoem in. */
  zoem: number;
  /** Agtergrond verwyder → moenie op 'n ander foto lê nie. */
  deursigtig: boolean;
};

export type KaartSpec =
  | {
      styl: "kop-beeld";
      uitleg: "beeld-bo" | "beeld-agter" | "beeld-langs";
      etiket: string;
      kop: string;
      byskrif: string;
      beeld: BeeldBron | null;
    }
  | {
      styl: "groot-getal";
      getal: string;
      eenheid: string;
      etiket: string;
      konteks: string;
      rigting: "op" | "af" | "neutraal";
    }
  | { styl: "aanhaling"; aanhaling: string; naam: string; rol: string; beeld: BeeldBron | null }
  | { styl: "lys"; kop: string; genommer: boolean; items: string[] }
  | { styl: "meme"; boTeks: string; onderTeks: string; beeld: BeeldBron | null };

export type Styl = KaartSpec["styl"];

export type Kaart = {
  vorm: Vorm;
  vel: Vel;
  /** Buitelyn-raam + voetskrif aan/af. */
  merk: boolean;
  spec: KaartSpec;
};

export type RenderKonteks = {
  datum: string;
  voetskrif?: string;
  /** 1 = vol grootte; 0.5 = vinnige voorskou. */
  skaal?: number;
};

export const VERSTEK_VOETSKRIF = "buitelyn.com/markte";

/* ── Normalisering ───────────────────────────────────────────────────── */

const GELDIGE_STYLE: Styl[] = ["kop-beeld", "groot-getal", "aanhaling", "lys", "meme"];

export function isStyl(w: unknown): w is Styl {
  return typeof w === "string" && (GELDIGE_STYLE as string[]).includes(w);
}

export function isVorm(w: unknown): w is Vorm {
  return typeof w === "string" && w in AFMETINGS;
}

function teks(w: unknown): string {
  return typeof w === "string" ? w : "";
}

function getal(w: unknown, verstek: number): number {
  return typeof w === "number" && Number.isFinite(w) ? w : verstek;
}

function klem(w: number, laag: number, hoog: number): number {
  return Math.min(hoog, Math.max(laag, w));
}

/** Beelde MOET reeds publiek gehuisves wees. 'n data:-URL sou die versoek-URL
 *  laat ontplof, satori se 500KB-bateperk breek, en kan nooit aan Buffer
 *  gegee word nie — so ons weier dit hier, by die enigste ingang. */
export function normaliseerBeeld(w: unknown): BeeldBron | null {
  if (!w || typeof w !== "object") return null;
  const b = w as Record<string, unknown>;
  const url = teks(b.url).trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  // Satori dekodeer WebP nie betroubaar nie: die kaart word stil blank.
  if (/\.webp(\?|$)/i.test(url)) return null;
  return {
    url,
    wydte: Math.max(1, Math.round(getal(b.wydte, 1000))),
    hoogte: Math.max(1, Math.round(getal(b.hoogte, 1000))),
    fokusX: klem(getal(b.fokusX, 0.5), 0, 1),
    fokusY: klem(getal(b.fokusY, 0.5), 0, 1),
    zoem: klem(getal(b.zoem, 1), 1, 4),
    deursigtig: Boolean(b.deursigtig),
  };
}

export function verstekSpec(styl: Styl): KaartSpec {
  switch (styl) {
    case "kop-beeld":
      return { styl, uitleg: "beeld-bo", etiket: "", kop: "", byskrif: "", beeld: null };
    case "groot-getal":
      return { styl, getal: "", eenheid: "", etiket: "", konteks: "", rigting: "neutraal" };
    case "aanhaling":
      return { styl, aanhaling: "", naam: "", rol: "", beeld: null };
    case "lys":
      return { styl, kop: "", genommer: true, items: ["", "", ""] };
    case "meme":
      return { styl, boTeks: "", onderTeks: "", beeld: null };
  }
}

/** Bou 'n volledige, veilige spec uit onbetroubare invoer (jsonb uit die DB,
 *  of 'n POST-lyf). Elke veld kry 'n waarde — 'n spec wat deur jsonb ÉN 'n
 *  gegenereerde vorm gaan, is 'n permanente bron van undefined-foute as velde
 *  opsioneel is. */
export function normaliseerSpek(w: unknown): KaartSpec {
  const s = (w ?? {}) as Record<string, unknown>;
  const styl = isStyl(s.styl) ? s.styl : "kop-beeld";
  const verstek = verstekSpec(styl);

  switch (verstek.styl) {
    case "kop-beeld":
      return {
        styl: "kop-beeld",
        uitleg:
          s.uitleg === "beeld-agter" || s.uitleg === "beeld-langs" ? s.uitleg : "beeld-bo",
        etiket: teks(s.etiket).slice(0, 40),
        kop: teks(s.kop).slice(0, 160),
        byskrif: teks(s.byskrif).slice(0, 320),
        beeld: normaliseerBeeld(s.beeld),
      };
    case "groot-getal":
      return {
        styl: "groot-getal",
        getal: teks(s.getal).slice(0, 12),
        eenheid: teks(s.eenheid).slice(0, 8),
        etiket: teks(s.etiket).slice(0, 80),
        konteks: teks(s.konteks).slice(0, 200),
        rigting: s.rigting === "op" || s.rigting === "af" ? s.rigting : "neutraal",
      };
    case "aanhaling":
      return {
        styl: "aanhaling",
        aanhaling: teks(s.aanhaling).slice(0, 320),
        naam: teks(s.naam).slice(0, 60),
        rol: teks(s.rol).slice(0, 80),
        beeld: normaliseerBeeld(s.beeld),
      };
    case "lys":
      return {
        styl: "lys",
        kop: teks(s.kop).slice(0, 120),
        genommer: s.genommer !== false,
        items: (Array.isArray(s.items) ? s.items : [])
          .map((i) => teks(i).slice(0, 140))
          .filter((i) => i.trim())
          .slice(0, 6),
      };
    case "meme":
      return {
        styl: "meme",
        boTeks: teks(s.boTeks).slice(0, 80),
        onderTeks: teks(s.onderTeks).slice(0, 80),
        beeld: normaliseerBeeld(s.beeld),
      };
  }
}

/** Normaliseer 'n hele kaart. Die sleutelvolgorde is vas sodat
 *  JSON.stringify(kaart) 'n stabiele voorskou-sleutel gee. */
export function normaliseerKaart(w: unknown): Kaart {
  const k = (w ?? {}) as Record<string, unknown>;
  const vel = k.vel;
  return {
    vorm: isVorm(k.vorm) ? k.vorm : "vierkant",
    vel:
      vel === "offwhite" || vel === "ink" || vel === "rooi" ? vel : "paper",
    merk: k.merk !== false,
    spec: normaliseerSpek(k.spec),
  };
}
