/* Die duimnael-spesifikasie: tipes, afmetings en normalisering.

   KLIËNT-VEILIG — geen JSX, geen next/og. Die redigeerder (client component)
   voer hierdie lêer, laag.ts en gloed.ts in; render.tsx is BEDIENER-ALLEEN.
   Word daardie invoer, sleep satori + resvg + yoga.wasm die blaaier-bundel in,
   en die bou slaag stilweg. */

import { normaliseerBeeld, type BeeldBron } from "@/lib/kaart/spec";
import { INK, OFFWHITE, ROOI } from "@/lib/kaart/tokens";

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

/* Die gloed gebruik Buitelyn se EIE rooi uit tokens.ts, nie 'n hex wat hier
   herhaal word nie. Die hex was #E2231A — naby genoeg om reg te lyk, maar dit
   is nie die huiskleur nie, en 'n duimnael langs 'n kaart sou effens uit wees. */
export const GLOED_VERSTEK: Gloed = { aan: true, kleur: ROOI, sterkte: 0.85, radius: 0.42 };

export type Laag =
  /** `spieël` draai die uitknipsel horisontaal om. Sit AP regs in die raam,
   *  kyk hy andersins by die rand uit; omgedraai kyk hy die raam in, na die
   *  opskrif toe. Dit raak net die reaksie — die gloed is 'n simmetriese
   *  gradiënt en die logo mag nooit gespieël word nie. */
  | {
      soort: "reaksie";
      url: string;
      wydte: number;
      hoogte: number;
      plek: Plek;
      gloed: Gloed;
      spieël: boolean;
    }
  | { soort: "logo"; kleur: "ink" | "wit"; plek: Plek }
  | {
      soort: "teks";
      teks: string;
      kleur: TeksKleur;
      /** Omlyning agter die letters. "geen" is geen omlyning nie. */
      omlyn: TeksKleur | "geen";
      belyn: "links" | "middel" | "regs";
      /** Die blok se breedte as breukdeel van die raam. Dit bepaal waar die
       *  woorde omvou — sonder dit loop 'n opskrif altyd tot by die rand en jy
       *  kan nie kies waar die reël breek nie. */
      breedte: number;
      plek: Plek;
    };

/** Teks bly by Buitelyn se palet. 'n Vrye kleurkieser klink vriendeliker, maar
 *  dit is presies hoe 'n huisstyl oor 'n paar episodes uitmekaar val — en die
 *  huisreël is monochroom plus EEN aksent. */
export type TeksKleur = "wit" | "ink" | "rooi";

export const TEKS_KLEURE: { sleutel: TeksKleur; naam: string; hex: string }[] = [
  { sleutel: "wit", naam: "Wit", hex: OFFWHITE },
  { sleutel: "ink", naam: "Ink", hex: INK },
  { sleutel: "rooi", naam: "Rooi", hex: ROOI },
];

const TEKS_HEX: Record<TeksKleur, string> = { wit: OFFWHITE, ink: INK, rooi: ROOI };

/** Die hex vir 'n teks-kleur. Een plek, sodat die voorskou en satori nooit
 *  verskillende kleure teken nie. */
export function teksHex(k: TeksKleur): string {
  return TEKS_HEX[k];
}

/** 'n Skaduwee help net waar die teks lig is op 'n donker plaat. Op ink is dit
 *  'n vuil rand. */
export function teksSkaduwee(k: TeksKleur): string {
  return k === "ink" ? "none" : "0 4px 18px rgba(0,0,0,0.55)";
}

/** Die omlyning as 'n -webkit-text-stroke-waarde, of "" vir geen.
 *
 *  Geverifieer teen satori op 2026-08-26: -webkit-text-stroke werk, en gee 'n
 *  skerper, egaliger rand as die ou truuk van agt textShadows. Blaaiers
 *  ondersteun dit natuurlik, so die voorskou en satori stem ooreen. */
export function teksOmlyn(omlyn: TeksKleur | "geen", fontSize: number): string {
  if (omlyn === "geen") return "";
  // Die rand skaal saam met die letters, anders is dit dik op klein teks.
  const dikte = Math.max(2, Math.round(fontSize * 0.06));
  return `${dikte}px ${TEKS_HEX[omlyn]}`;
}

export type Duimnael = {
  agtergrond: BeeldBron | null;
  /** Render-volgorde = skikking-volgorde. */
  lae: Laag[];
};

/* Prompt-voorafstellings vir die KI-agtergrond.

   Dit woon hier — kliënt-veilige data — sodat die blad dit kan invoer sonder om
   die roete (en sharp) in sy grafiek te sleep. AP kan enige prompt heeltemal
   oorskryf; die huisstyl leef in data, nie in kode nie.

   Die belangrikste sin in elkeen is die ANTI-AFGELEIDE een. /v1/images/edits is
   'n REDIGEER-eindpunt: sy verstek is om die invoerbeeld te transformeer. Sê jy
   net "inspired by the reference images", trek dit die verwysing self oor —
   dieselfde sterre, dieselfde strepe, net dowwer met grein bo-oor. Gemeet op
   2026-08-26 teen die M-Net-omslag: die ou prompt het die omslag herteken.

   Ons moet dus UITDRUKLIK sê: moenie die verwysing weergee, kopieer, sny of
   plak nie — gebruik dit net as 'n leidraad oor wat vandag se storie is. */
/** Waar AP in die raam sit. Die prompt MOET dit weet: die KI moet daardie kant
 *  leeg hou, anders beland die interessante deel presies agter sy kop. */
export type Kant = "links" | "regs";

export type Styl = { sleutel: string; naam: string; wat: string; kern: string };

const GEEN_AFGELEIDE =
  "The reference images indicate ONLY what today's story is about — do NOT reproduce, copy, crop, " +
  "collage or paste them, and never show the reference images themselves. Invent something new that " +
  "merely evokes those subjects. ";

/** Die reëls wat NIKS met styl te doen het nie: die medium, die leë kant vir AP,
 *  en die absolute teks-verbod. Hulle geld vir elke voorafstelling. */
function raamReels(kant: Kant): string {
  const leeg = kant === "links" ? "LEFT" : "RIGHT";
  const vol = kant === "links" ? "right" : "left";
  return (
    "MEDIUM: this is a 16:9 YouTube thumbnail, and it will often be seen as small as 320 pixels wide. " +
    "Use big simple shapes, strong contrast and clear separation; avoid fine detail, thin lines and " +
    "small busy elements, which all turn to mush at that size. " +
    `COMPOSITION: the ${leeg} THIRD of the frame must stay dark, quiet and visually EMPTY — a cut-out ` +
    `presenter is composited there afterwards, so nothing important may sit on that side. Place the ` +
    `visual interest toward the ${vol}, but keep it calm enough for a large headline to sit on top of it. ` +
    "NO PEOPLE: absolutely no people, no faces, no figures, no hands and no body parts anywhere in " +
    "the image. A real presenter is composited on top afterwards, so anyone you draw ends up as a " +
    "second person in the frame. " +
    "NO WORDING AT ALL: absolutely no text, no letters, no numbers, no words, no captions, no labels, " +
    "no logos, no watermarks and no signatures anywhere in the image. Every word on the final thumbnail " +
    "is added afterwards by hand, so any lettering you draw is a defect."
  );
}

export const STYLE: Styl[] = [
  {
    sleutel: "grafies",
    naam: "Grafies",
    wat: "Bold poster-kuns — groot vorms, skoon, lees goed klein.",
    kern:
      "Create an ORIGINAL bold graphic background plate for a business-news YouTube thumbnail. " +
      GEEN_AFGELEIDE +
      "Interpret the subjects ABSTRACTLY as symbols and forms. " +
      "STYLE: striking editorial poster art — oversized abstract shapes, hard diagonal light shafts, " +
      "layered depth, a restrained palette of near-black, charcoal and one vivid red, heavy texture " +
      "and grain, subtle halftone. Dramatic and premium, not busy. ",
  },
  {
    sleutel: "kinematies",
    naam: "Kinematies",
    wat: "Filmiese diepte — lig, mis, atmosfeer.",
    kern:
      "Design an ORIGINAL, dramatic editorial background plate for a business-news YouTube thumbnail. " +
      GEEN_AFGELEIDE +
      "Invent a completely new abstract scene that evokes those subjects: bold geometric forms, " +
      "sweeping light, depth and atmosphere. " +
      "STYLE: cinematic, high-contrast, near-black with one deep red accent, volumetric haze, subtle " +
      "film grain, dramatic rim lighting, a sense of scale and motion. Like a modern financial " +
      "documentary title card. ",
  },
  {
    sleutel: "rustig",
    naam: "Rustig",
    wat: "Amper leeg — laat die opskrif en AP die werk doen.",
    kern:
      "Create an ORIGINAL, restrained background plate for a business-news YouTube thumbnail. " +
      GEEN_AFGELEIDE +
      "STYLE: almost minimal — a deep near-black field with one soft red glow, a faint suggestion of " +
      "abstract form far to the side, gentle vignetting and fine film grain. Quiet, expensive, and " +
      "deliberately understated so the headline dominates. ",
  },
  {
    sleutel: "papier",
    naam: "Papier",
    wat: "Buitelyn se papier — room, ink en een rooi. Val op tussen donker duimnaels.",
    kern:
      "Create an ORIGINAL background plate for a business-news YouTube thumbnail, printed on PAPER. " +
      GEEN_AFGELEIDE +
      "Interpret the subjects ABSTRACTLY as bold printed shapes. " +
      "STYLE: warm off-white paper stock (#F7F6F2) with visible fibre and tooth, a screenprinted " +
      "editorial look in near-black ink and ONE vivid red, flat solid shapes with no gradients, slight " +
      "print misregistration, halftone dots, and the paper showing through as negative space. " +
      "Confident, graphic and analogue — like a printed financial broadsheet cover. ",
  },
];

/** Bou die volledige prompt vir 'n styl en 'n kant. */
export function bouPrompt(styl: Styl, kant: Kant): string {
  return styl.kern + raamReels(kant);
}

/** Die voorafstelling wat voorgelaai word. Grafies lees die beste by
 *  duimnael-grootte: groot vorms oorleef die afskaal na 320px. */
export const VERSTEK_PROMPT = bouPrompt(STYLE[0], "links");

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
      return {
        soort: "reaksie",
        url,
        wydte,
        hoogte,
        plek: plek(l.plek),
        gloed: gloed(l.gloed),
        spieël: l.spieël === true,
      };
    }
    case "logo":
      return { soort: "logo", kleur: l.kleur === "ink" ? "ink" : "wit", plek: plek(l.plek) };
    case "teks": {
      /* Begrens wat satori moet uitlê. 'n Opskrif langer as dit is by 1280×720
         in elk geval onleesbaar, en die suster-module begrens elke string wat
         sy aan satori gee. */
      const teks = typeof l.teks === "string" ? l.teks.trim().slice(0, MAKS_TEKS) : "";
      if (!teks) return null;
      const omlyn =
        l.omlyn === "wit" || l.omlyn === "ink" || l.omlyn === "rooi" ? l.omlyn : "geen";
      return {
        soort: "teks",
        teks,
        kleur: l.kleur === "ink" || l.kleur === "rooi" ? l.kleur : "wit",
        omlyn,
        belyn: l.belyn === "middel" || l.belyn === "regs" ? l.belyn : "links",
        /* Nooit 0 nie: 'n blok van breedte 0 kan geen woord bevat nie en is
           onsleepbaar. */
        breedte: Math.min(1, Math.max(0.05, getal(l.breedte, 0.5))),
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
