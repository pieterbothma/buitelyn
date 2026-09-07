/* Klipy-kliënt — GIF's, plakkers en statiese memes.

   Vervang Tenor, wat Google op 2026-06-30 permanent afgeskakel het. Klipy is
   deur oud-Tenor-mense gebou, het 'n lewenslange gratis vlak, en WhatsApp het
   ook daarheen getrek.

   BELANGRIK — dit loop KLIËNT-KANT, met opset.
   Klipy se integrasievoorwaardes sê uitdruklik: "API requests and media loads
   must originate from the user's mobile app, desktop app, or web browser. Do
   not route requests through partner-operated servers, proxies, CDNs, or other
   intermediaries without prior written approval."
   Dit is ook hoekom die sleutel in die URL-PAD sit en nie in 'n header nie: dis
   'n kliënt-sleutel in Tenor se ou styl, nie 'n geheim nie. Vandaar
   NEXT_PUBLIC_KLIPY_API_KEY. Ons het 'n bedienerproxy gehad; dit is verwyder
   om by hul voorwaardes te hou.

   Klipy vereis ook sigbare erkenning: die soekboks se plekhouer moet
   letterlik "Search KLIPY" wees. */

const BASIS = "https://api.klipy.com/api/v1";

/** Klipy se twee mediastelle wat ons gebruik. LET WEL: memes sit onder
 *  "static-memes", NIE "memes" nie — laasgenoemde gee "Route not found". */
export type Media = "gifs" | "static-memes";

export function klipyConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_KLIPY_API_KEY);
}

/* ── Rou vorm ────────────────────────────────────────────────────────────
   { result, data: { data: [ { id, slug, title, type, file: { hd|md|sm|xs:
     { gif|webp|jpg|mp4|webm|png: { url, width, height, size } } } } ],
     current_page, per_page, has_next } }
   GIF's gee gif/webp/mp4; statiese memes gee png/webp.                    */

type RouLeer = { url?: string; width?: number; height?: number; size?: number };
type RouGrootte = {
  gif?: RouLeer; webp?: RouLeer; jpg?: RouLeer; png?: RouLeer;
  mp4?: RouLeer; webm?: RouLeer;
};
export type RouGif = {
  id?: number | string;
  slug?: string;
  title?: string;
  type?: string; // "ad" vir geadverteerde items
  file?: { hd?: RouGrootte; md?: RouGrootte; sm?: RouGrootte; xs?: RouGrootte };
};
export type RouAntwoord = {
  result?: boolean;
  data?: { data?: RouGif[]; current_page?: number; per_page?: number; has_next?: boolean };
};

export type Gif = {
  id: string;
  titel: string;
  /** Klein weergawe vir die rooster. */
  voorskou: string;
  /** Die weergawe wat in die nuusbrief of op 'n kaart beland. */
  volledig: string;
  wydte: number;
  hoogte: number;
};

export type GifBladsy = { gifs: Gif[]; bladsy: number; nogMeer: boolean };

/** Kies die eerste grootte met 'n bruikbare leer, van klein na groot. */
function kies(
  file: RouGif["file"],
  groottes: ("xs" | "sm" | "md" | "hd")[],
  formate: (keyof RouGrootte)[]
): RouLeer | null {
  for (const g of groottes) {
    const vak = file?.[g];
    if (!vak) continue;
    for (const f of formate) {
      const leer = vak[f];
      if (leer?.url) return leer;
    }
  }
  return null;
}

/** Suiwer normalisering van Klipy se antwoord — die getoetste naat. */
export function normaliseerGifs(rou: RouAntwoord, media: Media = "gifs"): GifBladsy {
  const items = rou?.data?.data ?? [];
  const gifs: Gif[] = [];
  // 'n Beweegbare GIF moet .gif wees (Substack se markdown speel nie mp4 nie);
  // 'n statiese meme is 'n .png.
  const volledigFormate: (keyof RouGrootte)[] =
    media === "gifs" ? ["gif"] : ["png", "jpg"];

  for (const item of items) {
    // Klipy skuif advertensies tussen die resultate in; hulle hoort nie in
    // AP se nuusbrief nie.
    if (item?.type === "ad") continue;

    const voorskou = kies(item.file, ["sm", "xs", "md", "hd"], ["webp", ...volledigFormate]);
    const volledig = kies(item.file, ["md", "sm", "hd", "xs"], volledigFormate);
    if (!voorskou?.url || !volledig?.url) continue;

    gifs.push({
      id: String(item.id ?? item.slug ?? volledig.url),
      titel: (item.title ?? item.slug ?? "GIF").trim(),
      voorskou: voorskou.url,
      volledig: volledig.url,
      wydte: volledig.width ?? 0,
      hoogte: volledig.height ?? 0,
    });
  }

  return {
    gifs,
    bladsy: rou?.data?.current_page ?? 1,
    nogMeer: Boolean(rou?.data?.has_next),
  };
}

type Soekopsies = {
  media?: Media;
  navraag?: string;
  bladsy?: number;
  perBladsy?: number;
  /** Stabiele gebruiker-id vir Klipy se trending/recent-logika. */
  klant: string;
};

export function klipyUrl(opsies: Soekopsies): string {
  const media = opsies.media ?? "gifs";
  const navraag = opsies.navraag?.trim();
  const params = new URLSearchParams({
    page: String(opsies.bladsy ?? 1),
    per_page: String(opsies.perBladsy ?? 24),
    customer_id: opsies.klant,
    locale: "za",
    // Nuusmerk — hou dit streng.
    content_filter: "high",
  });
  if (navraag) params.set("q", navraag);
  const pad = navraag ? "search" : "trending";
  return `${BASIS}/${process.env.NEXT_PUBLIC_KLIPY_API_KEY}/${media}/${pad}?${params}`;
}

/** Soek. Sonder 'n navraag kry jy Klipy se trending-lys.
 *  Word direk uit die blaaier geroep — sien die kop van hierdie lêer. */
export async function soekKlipy(opsies: Soekopsies, sein?: AbortSignal): Promise<GifBladsy> {
  const res = await fetch(klipyUrl(opsies), { signal: sein });
  const rou = (await res.json().catch(() => null)) as
    | (RouAntwoord & { errors?: { message?: string[] } })
    | null;

  if (!res.ok || rou?.result === false) {
    /* Klipy antwoord 'n ONGELDIGE SLEUTEL met HTTP 404, nie 401 nie
       (regstreeks geverifieer 2026-08-13). Die statuskode alleen sou dus
       "Klipy 404" wys en soos 'n verkeerde URL lyk — hul boodskap is die
       bruikbare deel. */
    const boodskap = rou?.errors?.message?.join("; ") ?? `Klipy ${res.status}`;
    throw new Error(boodskap);
  }
  return normaliseerGifs(rou ?? {}, opsies.media ?? "gifs");
}
