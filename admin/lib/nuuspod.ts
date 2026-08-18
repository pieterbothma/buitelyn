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
};

const BRON = "https://www.kremetart.com/api/articles/all";

function teks(waarde: unknown): string {
  return typeof waarde === "string" ? waarde : "";
}

/** Maak nuuspod se antwoord veilig. Enigiets wat nie 'n lys is nie — 'n
 *  foutobjek, 'n HTML-foutbladsy, null — word 'n leë lys, want die Nuus-blad
 *  moet bly staan al is nuuspod af. */
export function normaliseerArtikels(rou: unknown): Artikel[] {
  if (!Array.isArray(rou)) return [];
  return rou
    .map((r) => {
      const a = r as Record<string, unknown>;
      return {
        id: teks(a.id),
        headline: teks(a.headline),
        summary: teks(a.summary),
        body: teks(a.body),
        sourceUrl: teks(a.sourceUrl),
        sourceName: teks(a.sourceName),
        category: teks(a.category),
        publishedAt: teks(a.publishedAt),
      };
    })
    .filter((a) => a.headline && a.sourceName);
}

/** Groepeer per bron: die bron met die meeste stories eerste, en binne elke
 *  bron die nuutste storie eerste. Die oortjie-volgorde is dus stabiel en
 *  nuttig eerder as alfabeties. */
export function groepeerPerBron(artikels: Artikel[]): { bron: string; artikels: Artikel[] }[] {
  const kaart = new Map<string, Artikel[]>();
  for (const a of artikels) {
    const lys = kaart.get(a.sourceName) ?? [];
    lys.push(a);
    kaart.set(a.sourceName, lys);
  }
  return [...kaart.entries()]
    .map(([bron, lys]) => ({
      bron,
      artikels: [...lys].sort((x, y) => y.publishedAt.localeCompare(x.publishedAt)),
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
    if (!res.ok) return [];
    return normaliseerArtikels(await res.json());
  } catch {
    return [];
  }
}
