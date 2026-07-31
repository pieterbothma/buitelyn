import { AANDELE } from "./aandele.ts";
import type { Gids } from "./gidse.ts";

export type GidsInhoud = {
  titel: string;
  beskrywing: string;
  intro: string;
  afdelings: { kop: string; paragrawe: string[] }[];
  verwant: string[];
  /** Die één sin waarin die borg genoem word — net beginnergidse. */
  sponsor_konteks: string | null;
};

/* 'n Model wat oorreed word, dryf. 'n Toets wat weier, dryf nie. Alles wat die
   gidse veilig hou — FSCA, taal, handelsmerk, werkende skakels — word hier
   afgedwing en nie in die prompt gehoop nie. */

// Afrikaans se gebiedende wys is werkwoord-vooraan in 'n hoofsin. 22/22
// gegenereerde pogings het geval op 'n kaal woordverbod, en elke treffer was
// suiwer beskrywend ("...aandele om te koop is 'n belangrike stap...") — die
// reël moes op modus (opdrag vs. verduideliking) toets, nie op die blote
// voorkoms van die woord nie. Ons merk dus koop/verkoop/belê net wanneer hulle
// 'n sin of 'n bullet begin (die werklike gebiedende posisie); die
// ondubbelsinnige veelwoord-frases bly enige plek gevaarlik, ongeag posisie.
//
// SIN_BEGIN loop met opset per aparte string (elke paragraaf, kop, ens. —
// sien onder), NIE oor die saamgevoegde alleTeks-blok nie: velde word met 'n
// spasie saamgevoeg, so 'n paragraaf wat op sy eie met "Koop ..." begin, sou
// in die saamgevoegde teks nie noodwendig deur sin-eindigende leestekens
// voorafgegaan word nie, en 'n werklike opdrag sou ongemerk verbygaan.
const SIN_BEGIN = /(^|[.!?:]\s+|^\s*[-•]\s*)(koop|verkoop|belê)(?![\p{L}])/iu;
const FRASE = /(?<![\p{L}])(belê nou|begin belê|kry jou|moenie mis nie|maak seker jy koop)(?![\p{L}])/iu;
const NIE_AFRIKAANS = /\b(achtbaan|beleggen|aandelen|winstgevend|geldbelegging|bourse|Aktien)\b/i;

// 'n LLM lewer rou, ongetipeerde JSON. Hierdie helper is die enigste plek waar
// ons 'n veld as teks aanvaar — 'n getal, objek of array tel nie, en niks hier
// gooi ooit 'n fout nie.
const isNieLeegString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const veiligeString = (v: unknown): string => (typeof v === "string" ? v : "");
// Vir die "mag nie teenwoordig wees nie"-toets: enige waarde behalwe
// null/undefined/"" tel as teenwoordig, al is dit die verkeerde tipe.
const heeftWaarde = (v: unknown): boolean => v !== null && v !== undefined && v !== "";

export function valideerGids(inhoud: unknown, gids: Gids): string[] {
  const foute: string[] = [];
  if (!inhoud || typeof inhoud !== "object") return ["inhoud is nie 'n objek nie"];
  const i = inhoud as Partial<GidsInhoud>;

  if (!isNieLeegString(i.titel)) foute.push("titel ontbreek");
  if (!isNieLeegString(i.beskrywing)) foute.push("beskrywing ontbreek");
  if (!isNieLeegString(i.intro)) foute.push("intro ontbreek");
  if (!Array.isArray(i.afdelings) || i.afdelings.length < 3) foute.push("minstens 3 afdelings word vereis");

  // Onwelvormde velde (bv. 'n string waar 'n stuk JSON 'n reeks moes wees)
  // val hier terug op 'n leë reeks — dit moet 'n fout oplewer, nie ontplof nie.
  const afdelings = Array.isArray(i.afdelings) ? i.afdelings : [];
  const verwant = Array.isArray(i.verwant) ? i.verwant : [];

  const titel = veiligeString(i.titel);
  const beskrywing = veiligeString(i.beskrywing);
  const intro = veiligeString(i.intro);
  const sponsorKonteks = veiligeString(i.sponsor_konteks);
  const paragraafDele = afdelings.flatMap((a) => [
    veiligeString(a?.kop),
    ...(Array.isArray(a?.paragrawe) ? a.paragrawe.map(veiligeString) : []),
  ]);

  // Elke los stuk teks — nie 'n titel-infinitief-stroping nodig nie: "Hoe om
  // aandele te koop" het "koop" nooit aan die begin van 'n sin nie, so
  // SIN_BEGIN vang dit eenvoudig nie; "Koop nou jou eerste aandeel" begin wél
  // met die werkwoord en word steeds gevang. (Sien fix-verslag rondte 3.)
  const teksdele = [titel, beskrywing, intro, sponsorKonteks, ...paragraafDele].filter(Boolean);
  const alleTeks = teksdele.join(" ");

  const sinBeginTreffer = teksdele
    .map((deel) => deel.match(SIN_BEGIN))
    .find((m): m is RegExpMatchArray => m !== null);
  if (sinBeginTreffer) foute.push(`imperatief gevind ("${sinBeginTreffer[2]}") — FSCA-grenslyn (sin begin met 'n opdrag)`);

  // Die frase-toets is posisie-onafhanklik en mag dus oor die saamgevoegde
  // teks loop.
  const fraseTreffer = alleTeks.match(FRASE);
  if (fraseTreffer) foute.push(`imperatief gevind ("${fraseTreffer[0]}") — FSCA-grenslyn`);

  const nl = alleTeks.match(NIE_AFRIKAANS);
  if (nl) foute.push(`nie-Afrikaanse woord gevind ("${nl[0]}")`);
  if (/Die Buitelyn/.test(alleTeks)) foute.push('"Die Buitelyn" — die handelsmerk is net "Buitelyn"');

  const bestaan = new Set(AANDELE.map((a) => a.slug));
  for (const slug of verwant) {
    if (!bestaan.has(slug)) foute.push(`verwante slug bestaan nie: ${slug}`);
  }

  if (gids.sponsor && !isNieLeegString(i.sponsor_konteks)) foute.push("sponsor_konteks word vereis op 'n beginnergids");
  if (!gids.sponsor && heeftWaarde(i.sponsor_konteks)) foute.push("sponsor_konteks mag nie op 'n konsepgids wees nie");

  return foute;
}
