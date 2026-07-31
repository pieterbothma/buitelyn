/* Die geloofwaardigheid van die hele klik-telling sit in hierdie lêer. 'n Syfer
   wat Googlebot insluit, verloor die onderhandeling én die vertroue vir die
   volgende een — dus filter ons streng en tel liewer te min. */

const KRUIPERS = [
  "bot", "crawl", "spider", "slurp", "curl", "wget", "python-requests",
  "httpclient", "headlesschrome", "phantomjs", "facebookexternalhit",
  "whatsapp", "telegrambot", "preview", "monitor", "uptime", "lighthouse",
  "gptbot", "claudebot", "perplexity", "ccbot", "bytespider",
];

export function isKruiper(ua: string | null): boolean {
  if (!ua) return true; // geen UA = geen mens
  const k = ua.toLowerCase();
  return KRUIPERS.some((n) => k.includes(n));
}

/** SA-kalenderdag — die sout roteer op middernag in Johannesburg. */
export function dagSleutelVan(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(d);
}

/* Die geheimhouding van die sout is die ENIGSTE ding wat keer dat 'n gestoorde
   hash na 'n regte IP omgekeer kan word — IPv4 is klein genoeg (~4.3 miljard
   adresse) dat SHA-256 daaroor, gekombineer met 'n handjievol algemene UA's,
   binne minute uitgetel kan word. Daarom mag hierdie funksie NOOIT stilweg
   terugval na 'n hardgekodeerde waarde nie: 'n ontbrekende of te-kort sout
   moet hard faal, nie stil 'n swak verstek gebruik nie. */
const MIN_SOUT_LENGTE = 16;

/* Daaglikse rotasie beteken 'n besoeker kan binne 'n dag ontdubbel word maar
   nie oor dae heen gevolg word nie. Die rou IP verlaat nooit hierdie funksie. */
export async function besoekerHash(ip: string, ua: string, dagSleutel: string): Promise<string> {
  const sout = process.env.KLIK_SOUT;
  if (!sout || sout.length < MIN_SOUT_LENGTE) {
    throw new Error(
      `KLIK_SOUT moet as omgewingveranderlike gestel word (minstens ${MIN_SOUT_LENGTE} karakters) voordat besoekerHash gebruik kan word — sonder 'n geheime sout is die hash omkeerbaar na die rou IP.`
    );
  }
  const data = new TextEncoder().encode(`${sout}:${dagSleutel}:${ip}:${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
