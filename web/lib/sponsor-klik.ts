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

/* Daaglikse rotasie beteken 'n besoeker kan binne 'n dag ontdubbel word maar
   nie oor dae heen gevolg word nie. Die rou IP verlaat nooit hierdie funksie. */
export async function besoekerHash(ip: string, ua: string, dagSleutel: string): Promise<string> {
  const sout = process.env.KLIK_SOUT ?? "buitelyn-gidse";
  const data = new TextEncoder().encode(`${sout}:${dagSleutel}:${ip}:${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
