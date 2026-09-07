/* nuuspod skraap reeds News24/Netwerk24, Maroela, The Citizen, Daily Maverick,
   PoliticsWeb, CommonSense, Daily Investor, MyBroadband en 'n stel
   internasionale strome, laat Gemini dit herskryf en stoor dit in Vercel Blob.
   Ons LEES net daardie uitslag — Buitelyn skraap niks self nie, anders betaal
   ons die skraper-API twee keer en kry twee kopieë wat uiteenloop. */

export type Artikel = {
  id: string;
  headline: string;
  summary: string;
  body: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  publishedAt: string;
  imageUrl: string;
  /* Die artikel se plek BINNE sy kategorie by kremetart. Sien groepeerPerBron. */
  rang: number;
};

const BRON = "https://www.kremetart.com/api/articles/all";

function teks(waarde: unknown): string {
  return typeof waarde === "string" ? waarde : "";
}

/** Die kremetart-eindpunt groepeer sy antwoord per kategorie — 'n objek met
 *  'n skikking per sleutel ({ sport: [...], wereld: [...], ... }) — maar ons
 *  groepeer self per bron (sien groepeerPerBron), so daardie
 *  kategorie-groepering is vir ons nutteloos en word hier plat afgemaak.
 *  'n Kaal skikking (die ou vorm, steeds gedek deur die vaslegging-toetse)
 *  moet ook bly werk. Ekstra skalêre sleutels (bv. 'n toekomstige
 *  { total: 355, sport: [...] }) word net uitgefilter — dis nie 'n rede om
 *  élke artikel weg te gooi nie, dis presies die vorm-skuif wat hierdie
 *  branch se bladsy vantevore laat verdwyn het. Enigiets sonder skikkings —
 *  'n foutobjek, 'n HTML-foutbladsy, null — word steeds 'n leë lys. */
/* kremetart gee 'n objek terug wat per kategorie groepeer ("wereld", "asie",
   "suid-afrika", …), elke waarde 'n lys. Ons hergroepeer per BRON, dus is die
   kategorie-groepering vir ons nutteloos — maar die POSISIE binne 'n kategorie
   is waardevol: dit is kremetart se eie volgorde, hoofstorie eerste.

   Ons hou daardie posisie as `rang` by, want die alternatief is stil verkeerd:
   Netwerk24 se 114 artikels dra net 3 verskillende publishedAt-waardes, dus doen
   'n sortering op datum feitlik niks en bly die invoegvolgorde staan — en dié is
   die kategorie-sleutels se volgorde, wat "wereld" heelbo sit en Suid-Afrikaanse
   nuus heel onder. Vandaar 'n bladsy vol Trump terwyl die bron self plaaslik lei.

   'n Kaal lys word ook aanvaar (rang = die posisie in daardie lys). */
/* 'n Datum wat nie ontleed nie, word 'n leë string eerder as om deur te gaan:
   nuus-lys gee dit aan `new Date()`, en 'n ongeldige datum gooi daar 'n
   RangeError wat die HELE Nuus-roete afskiet — daar is geen error.tsx nie.
   Een bron met 'n vreemde datumformaat mag nie die blad doodmaak nie. */
function geldigeDatum(waarde: unknown): string {
  const t = teks(waarde);
  return Number.isFinite(Date.parse(t)) ? t : "";
}

function plataAf(rou: unknown): { item: unknown; rang: number }[] {
  if (Array.isArray(rou)) return rou.map((item, rang) => ({ item, rang }));
  if (!rou || typeof rou !== "object") return [];
  return Object.values(rou as Record<string, unknown>)
    .filter(Array.isArray)
    .flatMap((lys) => (lys as unknown[]).map((item, rang) => ({ item, rang })));
}

export function normaliseerArtikels(rou: unknown): Artikel[] {
  return plataAf(rou)
    .map(({ item, rang }) => {
      const a = item as Record<string, unknown>;
      return {
        id: teks(a.id),
        headline: teks(a.headline),
        summary: teks(a.summary),
        body: teks(a.body),
        sourceUrl: teks(a.sourceUrl),
        sourceName: teks(a.sourceName),
        category: teks(a.category),
        /* publishedAt ?? createdAt. nuuspod gee sedert 2026-08-18 'n egte
           publikasietyd, maar twee dinge hou die terugval nodig:

           - Artikels wat reeds in Blob lê, behou hul ingestorte tyd totdat
             hulle weer geskraap word.
           - Vir draadberigte waar die bladsy niks sê nie, is publishedAt nou
             doelbewus leeg — 'n versinde tyd sorteer verkeerd terwyl dit eg
             lyk. nuuspod se eie laaste stap val op "nou" terug sodat die
             antwoord nie-null bly.

           Ná die volgende volle skraaplopie sê `npx tsx .data/_check-published.ts`
           (in die nuuspod-repo) hoeveel artikels nog 'n ingestorte waarde het.
           Naby nul vir die bronne wat saak maak: haal hierdie terugval uit en
           sorteer op datum voor KATEGORIE_ORDE. */
        publishedAt: geldigeDatum(a.publishedAt) || geldigeDatum(a.createdAt),
        imageUrl: teks(a.imageUrl),
        rang,
      };
    })
    .filter((a) => a.headline && a.sourceName);
}

/* Kategorieë in leesvolgorde: plaaslik eerste, res agterna.

   Hoekom dit nodig is: 'n bron se artikels dra feitlik almal dieselfde
   publishedAt (Netwerk24 se 114 stories het 3 verskillende waardes), dus doen
   'n datum-sortering niks en bly kremetart se kategorie-volgorde staan — en
   dié begin by "wereld". Gevolg: 'n Suid-Afrikaanse bron wat met Trump en
   oorlog open terwyl die bron self plaaslik lei.

   Alles wat nie hier gelys is nie (wereld, vsa, midde-ooste, asie, bbc …) kry
   dieselfde, laer rang en behou onderling die bron se eie volgorde.

   As nuuspod ooit 'n EGTE publikasietyd begin gee, draai die sortering om:
   dan behoort die datum eerste te kom en hierdie lys net die gelykspel te
   breek. */
const KATEGORIE_ORDE = [
  "suid-afrika",
  "beeld",
  "volksblad",
  "dieburger",
  "netwerk24",
  "news24",
  "maroela",
  "laevelder",
  "pretoria-rekord",
  "dailyinvestor",
  "mybroadband",
  "politicsweb",
  "commonsense",
  "dailymaverick",
  "afrika",
  "vermaak",
  "sport",
  "vreemde-stories",
];

function kategorieRang(kategorie: string): number {
  const i = KATEGORIE_ORDE.indexOf(kategorie);
  return i === -1 ? KATEGORIE_ORDE.length : i;
}

/** Groepeer per bron: die bron met die meeste stories eerste, en binne elke
 *  bron eers op kategorie (plaaslik bo — sien KATEGORIE_ORDE), dan op datum,
 *  dan op `rang` (kremetart se eie volgorde binne 'n kategorie). Die datums is
 *  grofweg almal die skraaplopie s'n, dus doen die eerste en derde sleutel in
 *  die praktyk die werk.
 *
 *  Dieselfde artikel staan dikwels in twee kategorieë (bv. "wereld" én
 *  "internasionaal"), dus gooi ons duplikate op id weg — anders sien 'n mens
 *  dieselfde storie twee keer en React kry botsende sleutels. */
export function groepeerPerBron(artikels: Artikel[]): { bron: string; artikels: Artikel[] }[] {
  const gesien = new Set<string>();
  const kaart = new Map<string, Artikel[]>();
  for (const a of artikels) {
    if (a.id) {
      if (gesien.has(a.id)) continue;
      gesien.add(a.id);
    }
    const lys = kaart.get(a.sourceName) ?? [];
    lys.push(a);
    kaart.set(a.sourceName, lys);
  }
  return [...kaart.entries()]
    .map(([bron, lys]) => ({
      bron,
      artikels: [...lys].sort(
        (x, y) =>
          kategorieRang(x.category) - kategorieRang(y.category) ||
          y.publishedAt.localeCompare(x.publishedAt) ||
          x.rang - y.rang
      ),
    }))
    .sort((x, y) => y.artikels.length - x.artikels.length);
}

export async function kryArtikels(): Promise<Artikel[]> {
  try {
    const res = await fetch(BRON, {
      next: { revalidate: 600 },
      headers: {
        "user-agent": "APHQ/1.0 (buitelyn admin)",
        /* Sonder hierdie kop stuur nuuspod se middleware ons na /login en
           ons ontleed 'n aanmeldblad as artikels — wat stil [] gee. */
        authorization: `Bearer ${process.env.NUUS_DEEL_SLEUTEL ?? ""}`,
      },
    });
    if (!res.ok) {
      // Status alleen — nooit die Authorization-kop of die geheim self nie.
      console.error("nuuspod", res.status);
      return [];
    }
    return normaliseerArtikels(await res.json());
  } catch (e) {
    console.error("nuuspod", e);
    return [];
  }
}
