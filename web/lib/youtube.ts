import { XMLParser } from "fast-xml-parser";

/* Die kanaal se jongste video, uit YouTube se RSS.

   RSS en nie die Data API nie: geen sleutel, geen kwota, en dieselfde parser
   as lib/feed.ts. Die voer dra 15 inskrywings met alles wat die TV-blok nodig
   het — titel, ID, datum en 'n duimnael — in een haal. */

export type Video = {
  id: string;
  titel: string;
  gepubliseer: string;
  duimnael: string;
};

const KANAAL = process.env.YT_KANAAL_ID ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function teks(waarde: any): string {
  if (waarde == null) return "";
  if (typeof waarde === "string") return waarde;
  if (typeof waarde === "number") return String(waarde);
  return "";
}

/** Ontleed die voer. Gee null as daar niks bruikbaars in is nie — 'n kanaal
 *  sonder video's en 'n stukkende voer lyk hier dieselfde, en albei moet die
 *  blad laat staan. */
export function parseVoer(xml: string): Video | null {
  const parser = new XMLParser({ ignoreAttributes: false });
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const voer = (doc as any)?.feed;
  const rou = voer?.entry;
  if (!rou) return null;
  const eerste = Array.isArray(rou) ? rou[0] : rou;
  if (!eerste) return null;

  const id = teks(eerste["yt:videoId"]);
  const titel = teks(eerste.title);
  if (!id || !titel) return null;

  /* Die voer dra 'n media:thumbnail, maar dit is hqdefault. Ons vra self vir
     maxresdefault: die fasade wys die prent groot, en hqdefault se 480px word
     dan sigbaar sag. */
  return {
    id,
    titel,
    gepubliseer: teks(eerste.published),
    duimnael: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  };
}

/** Haal die jongste video. Gooi NOOIT nie: die tuisblad se markte-rooster mag
 *  nie saam met 'n stil YouTube omval nie — dieselfde reël as lib/feed.ts. */
export async function getNuutsteVideo(): Promise<Video | null> {
  if (!KANAAL) return null;
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${KANAAL}`, {
      next: { revalidate: 600 },
      headers: { "user-agent": "buitelyn.com" },
    });
    if (!res.ok) return null;
    return parseVoer(await res.text());
  } catch {
    return null;
  }
}
