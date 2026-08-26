/* Die duimnael-spesifikasie: tipes, afmetings en normalisering.

   KLIËNT-VEILIG — geen JSX, geen next/og. Die redigeerder (client component)
   voer hierdie lêer, laag.ts en gloed.ts in; render.tsx is BEDIENER-ALLEEN.
   Word daardie invoer, sleep satori + resvg + yoga.wasm die blaaier-bundel in,
   en die bou slaag stilweg. */

import { normaliseerBeeld, type BeeldBron } from "@/lib/kaart/spec";

export const RAAM = { w: 1280, h: 720 } as const;

/** Waar 'n laag sit. Alles 0..1 van die raam af, dus resolusie-onafhanklik.
 *
 *  `grootte` beteken NIE dieselfde ding vir elke laagsoort nie:
 *    • reaksie en logo → die laag se BREEDTE as breukdeel van die raam s'n;
 *    • teks           → die FONTGROOTTE as breukdeel van die raam se breedte.
 *  Teks se breedte volg uit die woorde en kan nie vooraf vasgestel word nie.
 *  laag.ts los dié verskil op één plek op. */
export type Plek = { x: number; y: number; grootte: number };

/** Die rooi gloed agter AP. Dit is 'n EIENSKAP van die reaksie-laag, nie 'n
 *  aparte laag nie, sodat dit hom volg wanneer hy gesleep word. */
export type Gloed = {
  aan: boolean;
  kleur: string;
  /** 0..1 — dekking in die middel van die gradiënt. */
  sterkte: number;
  /** Breukdeel van die raam se breedte. */
  radius: number;
};

export const GLOED_VERSTEK: Gloed = { aan: true, kleur: "#E2231A", sterkte: 0.85, radius: 0.42 };

export type Laag =
  | { soort: "reaksie"; url: string; wydte: number; hoogte: number; plek: Plek; gloed: Gloed }
  | { soort: "logo"; kleur: "ink" | "wit"; plek: Plek }
  | { soort: "teks"; teks: string; kleur: "wit" | "ink"; belyn: "links" | "middel" | "regs"; plek: Plek };

export type Duimnael = {
  agtergrond: BeeldBron | null;
  /** Render-volgorde = skikking-volgorde. */
  lae: Laag[];
};

/* Die verstek-prompt vir die KI-agtergrond. Dit woon hier — kliënt-veilige data —
   sodat die blad dit kan invoer sonder om die roete (en sharp) in sy grafiek te
   sleep. AP kan dit heeltemal oorskryf; die huisstyl leef in data, nie in kode nie. */
export const VERSTEK_PROMPT =
  "A bold YouTube thumbnail BACKGROUND PLATE inspired by the reference images. " +
  "Dark, near-black, richly textured, with subtle film grain and a deep red tint. " +
  "Keep the LEFT THIRD darker and visually quiet — a person will be placed there. " +
  "Keep the right two thirds calm enough for a headline to sit on top. " +
  "Absolutely no people, no faces, no text, no lettering, no logos, no watermarks.";

const LEEG: Duimnael = { agtergrond: null, lae: [] };

const MAKS_TEKS = 120;

function getal(n: unknown, verstek: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : verstek;
}

function klem01(n: unknown, verstek: number): number {
  return Math.min(1, Math.max(0, getal(n, verstek)));
}

/** Grootte mag nooit 0 wees nie: 'n laag met grootte 0 is onsigbaar én
 *  onsleepbaar, so AP kan dit nie weer terugkry nie. */
function klemGrootte(n: unknown): number {
  return Math.min(1, Math.max(0.01, getal(n, 0.2)));
}

function plek(rou: unknown): Plek {
  const p = (rou ?? {}) as Record<string, unknown>;
  return { x: klem01(p.x, 0.5), y: klem01(p.y, 0.5), grootte: klemGrootte(p.grootte) };
}

function gloed(rou: unknown): Gloed {
  if (rou == null || typeof rou !== "object") return GLOED_VERSTEK;
  const g = rou as Record<string, unknown>;
  return {
    aan: typeof g.aan === "boolean" ? g.aan : GLOED_VERSTEK.aan,
    kleur: typeof g.kleur === "string" && /^#[0-9a-fA-F]{6}$/.test(g.kleur) ? g.kleur : GLOED_VERSTEK.kleur,
    sterkte: klem01(g.sterkte, GLOED_VERSTEK.sterkte),
    radius: Math.min(1.5, Math.max(0.05, getal(g.radius, GLOED_VERSTEK.radius))),
  };
}

/** 'n data:-URL is verbode. satori haal beelde by ELKE render weer af, en 'n
 *  ingebedde base64-string laat die spec megagrepe swaar word. */
function bruikbareUrl(u: unknown): string | null {
  return typeof u === "string" && /^https?:\/\//i.test(u) ? u : null;
}

function laag(rou: unknown): Laag | null {
  if (rou == null || typeof rou !== "object") return null;
  const l = rou as Record<string, unknown>;
  switch (l.soort) {
    case "reaksie": {
      const url = bruikbareUrl(l.url);
      const wydte = getal(l.wydte, 0);
      const hoogte = getal(l.hoogte, 0);
      if (!url || wydte <= 0 || hoogte <= 0) return null;
      return { soort: "reaksie", url, wydte, hoogte, plek: plek(l.plek), gloed: gloed(l.gloed) };
    }
    case "logo":
      return { soort: "logo", kleur: l.kleur === "ink" ? "ink" : "wit", plek: plek(l.plek) };
    case "teks": {
      /* Begrens wat satori moet uitlê. 'n Opskrif langer as dit is by 1280×720
         in elk geval onleesbaar, en die suster-module begrens elke string wat
         sy aan satori gee. */
      const teks = typeof l.teks === "string" ? l.teks.trim().slice(0, MAKS_TEKS) : "";
      if (!teks) return null;
      return {
        soort: "teks",
        teks,
        kleur: l.kleur === "ink" ? "ink" : "wit",
        belyn: l.belyn === "middel" || l.belyn === "regs" ? l.belyn : "links",
        plek: plek(l.plek),
      };
    }
    default:
      return null;
  }
}

export function normaliseerDuimnael(rou: unknown): Duimnael {
  if (rou == null || typeof rou !== "object") return LEEG;
  const d = rou as Record<string, unknown>;
  const lae = Array.isArray(d.lae) ? d.lae.map(laag).filter((l): l is Laag => l !== null) : [];
  /* Hergebruik kaart se normaliseerder: dit klem fokus en zoem, vloer wydte en
     hoogte, dwing deursigtig na 'n boolean, en weier WebP-URL's — wat ons
     eie WebP-reël gratis afdwing. */
  const agtergrond = normaliseerBeeld(d.agtergrond);
  return { agtergrond, lae };
}
