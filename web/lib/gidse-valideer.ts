import { AANDELE } from "./aandele";
import type { Gids } from "./gidse";

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

// JavaScript se \b is ASCII-gebaseer: \w ken "ê" nie as 'n woordkarakter nie,
// so \b faal stil ná diakritiese letters ("begin belê\b" kon nooit ooit
// pas nie). 'n Eie grens op grond van Unicode-letters (\p{L}) los dit reg —
// dit herken 'n woordgrens ná "ê", "ë", "é", "ï", "ô", "û" ens., én weier steeds
// om binne-in 'n saamgestelde woord soos "koopkrag" of "verkoopprys" te pas
// (die letter net ná "koop" verhoed die grens, so die inperkende (?![\p{L}])
// gee dieselfde beskerming as die ou \b, net Unicode-bewus).
const GRENS_VOOR = "(?<![\\p{L}])";
const GRENS_NA = "(?![\\p{L}])";
const IMPERATIEWE = new RegExp(
  `${GRENS_VOOR}(koop|verkoop|belê nou|begin belê|kry jou|moenie mis nie|maak seker jy koop)${GRENS_NA}`,
  "iu",
);
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

  const alleTeks = [
    titel, beskrywing, intro, sponsorKonteks,
    ...afdelings.flatMap((a) => [veiligeString(a?.kop), ...(Array.isArray(a?.paragrawe) ? a.paragrawe.map(veiligeString) : [])]),
  ]
    .filter(Boolean)
    .join(" ");

  // Die titel word nie heeltemal uitgesluit van die imperatief-toets nie —
  // dit is presies die veld wat Gemini genereer (dit word die H1 en die
  // meta-titel), so 'n opdrag daar is die sigbaarste plek waar dit kan gebeur.
  // Ons neutraliseer net die "om ... te <werkwoord>"-infinitiefkonstruksie:
  // "Hoe om aandele te koop" is die soekfrase self en vee skoon uit; "Koop Nou
  // Jou Eerste Aandeel" het nie hierdie konstruksie nie en word steeds gevang.
  const titelVeilig = titel.replace(new RegExp(`\\bom\\b[\\s\\S]*?\\bte\\s+(koop|verkoop|belê)${GRENS_NA}`, "giu"), "");

  const teksVirImperatief = [
    titelVeilig, beskrywing, intro, sponsorKonteks,
    ...afdelings.flatMap((a) => [veiligeString(a?.kop), ...(Array.isArray(a?.paragrawe) ? a.paragrawe.map(veiligeString) : [])]),
  ]
    .filter(Boolean)
    .join(" ");

  const imp = teksVirImperatief.match(IMPERATIEWE);
  if (imp) foute.push(`imperatief gevind ("${imp[0]}") — FSCA-grenslyn`);
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
