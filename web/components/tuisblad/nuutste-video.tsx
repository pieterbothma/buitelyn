/* Die nuutste YouTube-EPISODE, ingebed bo "Vandag op die markte".

   Geen API-sleutel nie: YouTube se RSS-feed per kanaal dra die jongste
   video's. Die kanaal se nuutste laai is dikwels 'n Short (vertikaal, met
   #-hutsmerke in die titel) wat lelik in 'n 16:9-kaart embed — ons vat dus
   die eerste inskrywing SONDER 'n # in die titel, wat op hierdie kanaal
   netjies episodes van Shorts skei.

   As YouTube stil is (netwerk, leë feed) render die kaart glad nie —
   die tuisblad se markte-kant mag nooit saam met YouTube afgaan nie. */

const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=";

type Video = { id: string; titel: string; datum: string };

async function nuutsteEpisode(): Promise<Video | null> {
  const kanaal = process.env.YT_KANAAL_ID;
  if (!kanaal) return null;
  try {
    const res = await fetch(`${FEED}${kanaal}`, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const xml = await res.text();
    const inskrywings = xml.split("<entry>").slice(1);
    for (const stuk of inskrywings) {
      /* RSS lewer XML-ontsnapte teks ("&amp;"); React ontsnap weer en die
         kyker sien die entiteit rou. Ontsnap dus hier terug. */
      const titel = (stuk.match(/<title>([^<]+)<\/title>/)?.[1] ?? "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      if (titel.includes("#")) continue; // Short — slaan oor
      const id = stuk.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const datum = stuk.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      if (id) return { id, titel, datum };
    }
    return null;
  } catch {
    return null;
  }
}

export async function NuutsteVideo() {
  const video = await nuutsteEpisode();
  if (!video) return null;
  const datumFmt = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg", day: "numeric", month: "long",
  });
  return (
    <section className="border-2 border-ink bg-offwhite">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-4">
        <p className="text-[11px] font-bold tracking-[0.14em] text-ink/60">
          NUUTSTE EPISODE · {datumFmt.format(new Date(video.datum)).toUpperCase()}
        </p>
      </div>
      <h2 className="px-5 pb-3 pt-1 text-lg font-bold leading-snug">{video.titel}</h2>
      <div className="aspect-video w-full">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.id}`}
          title={video.titel}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </section>
  );
}
