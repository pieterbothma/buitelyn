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

const IMPERATIEWE = /\b(koop|verkoop|belê nou|begin belê|kry jou|moenie mis nie|maak seker jy koop)\b/i;
const NIE_AFRIKAANS = /\b(achtbaan|beleggen|aandelen|winstgevend|geldbelegging|bourse|Aktien)\b/i;

export function valideerGids(inhoud: unknown, gids: Gids): string[] {
  const foute: string[] = [];
  if (!inhoud || typeof inhoud !== "object") return ["inhoud is nie 'n objek nie"];
  const i = inhoud as Partial<GidsInhoud>;

  if (!i.titel?.trim()) foute.push("titel ontbreek");
  if (!i.beskrywing?.trim()) foute.push("beskrywing ontbreek");
  if (!i.intro?.trim()) foute.push("intro ontbreek");
  if (!Array.isArray(i.afdelings) || i.afdelings.length < 3) foute.push("minstens 3 afdelings word vereis");

  // Onwelvormde velde (bv. 'n string waar 'n stuk JSON 'n reeks moes wees)
  // val hier terug op 'n leë reeks — dit moet 'n fout oplewer, nie ontplof nie.
  const afdelings = Array.isArray(i.afdelings) ? i.afdelings : [];
  const verwant = Array.isArray(i.verwant) ? i.verwant : [];

  const alleTeks = [
    i.titel, i.beskrywing, i.intro, i.sponsor_konteks,
    ...afdelings.flatMap((a) => [a?.kop, ...(Array.isArray(a?.paragrawe) ? a.paragrawe : [])]),
  ]
    .filter(Boolean)
    .join(" ");

  // Die titel skakel uit vir die imperatief-toets: "Hoe om aandele te koop" is
  // die soekfrase self, nie 'n opdrag aan die leser nie. Die res van die teks
  // (liggaam, sponsor-konteks) moet steeds vry van imperatiewe wees.
  const teksSonderTitel = [
    i.beskrywing, i.intro, i.sponsor_konteks,
    ...afdelings.flatMap((a) => [a?.kop, ...(Array.isArray(a?.paragrawe) ? a.paragrawe : [])]),
  ]
    .filter(Boolean)
    .join(" ");

  const imp = teksSonderTitel.match(IMPERATIEWE);
  if (imp) foute.push(`imperatief gevind ("${imp[0]}") — FSCA-grenslyn`);
  const nl = alleTeks.match(NIE_AFRIKAANS);
  if (nl) foute.push(`nie-Afrikaanse woord gevind ("${nl[0]}")`);
  if (/Die Buitelyn/.test(alleTeks)) foute.push('"Die Buitelyn" — die handelsmerk is net "Buitelyn"');

  const bestaan = new Set(AANDELE.map((a) => a.slug));
  for (const slug of verwant) {
    if (!bestaan.has(slug)) foute.push(`verwante slug bestaan nie: ${slug}`);
  }

  if (gids.sponsor && !i.sponsor_konteks?.trim()) foute.push("sponsor_konteks word vereis op 'n beginnergids");
  if (!gids.sponsor && i.sponsor_konteks) foute.push("sponsor_konteks mag nie op 'n konsepgids wees nie");

  return foute;
}
