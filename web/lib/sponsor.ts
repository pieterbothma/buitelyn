// web/lib/sponsor.ts
/* EEN plek besit die borg se bestemming. Kry EasyEquities later 'n
   vennoot-URL met hul eie ref-kode, verander net `bestemming` — geen artikel
   word geraak nie. */

export type Plek = "inlyn" | "voetkaart";
export type SponsorSleutel = "easyequities";

export const SPONSORS = {
  easyequities: {
    naam: "EasyEquities",
    bestemming: "https://www.easyequities.co.za/",
    /* Buitelyn verdien NIKS aan hierdie skakel nie — EasyEquities borg die
       YouTube-program. Dit word op elke gids openbaar gemaak. */
    utm: { utm_source: "buitelyn", utm_medium: "gids", utm_campaign: "buitelyn-gidse" },
  },
} as const;

export function klikUrl(sponsor: SponsorSleutel, gids: string, plek: Plek): string {
  return `/uit/${sponsor}?g=${encodeURIComponent(gids)}&p=${plek}`;
}

export function bestemmingMetUtm(sponsor: SponsorSleutel, gids: string): string {
  const s = SPONSORS[sponsor];
  const url = new URL(s.bestemming);
  for (const [k, v] of Object.entries(s.utm)) url.searchParams.set(k, v);
  url.searchParams.set("utm_content", gids);
  return url.toString();
}
