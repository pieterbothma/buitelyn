/* Die publieke /gidse-universum. Beginnergidse dra die EasyEquities-vermelding
   (dit beantwoord daar 'n werklike vraag); konsepgidse dra nooit een nie en is
   die interne-skakel-lym na die 52 /aandele-blaaie. */

export type Gids = {
  slug: string;
  titel: string;
  /** Die soekvraag wat die gids beantwoord — voed die Gemini-prompt. */
  vraag: string;
  groep: "beginner" | "konsep";
  sponsor: boolean;
  /** /aandele-slugs (NIE tickers nie) waarheen die gids skakel. */
  verwant: string[];
};

export const GIDSE: Gids[] = [
  {
    slug: "hoe-om-aandele-te-koop",
    titel: "Hoe om aandele te koop in Suid-Afrika",
    vraag: "Hoe koop 'n gewone Suid-Afrikaner sy eerste aandeel?",
    groep: "beginner",
    sponsor: true,
    verwant: ["naspers", "capitec", "sasol"],
  },
  {
    slug: "wat-kos-dit-om-te-bele",
    titel: "Wat kos dit om te belê?",
    vraag: "Watter fooie betaal jy werklik wanneer jy aandele koop?",
    groep: "beginner",
    sponsor: true,
    verwant: ["naspers", "shoprite"],
  },
  {
    slug: "hoe-kies-jy-n-makelaar",
    titel: "Hoe kies jy 'n makelaar?",
    vraag: "Waarop let jy wanneer jy 'n aandelemakelaar in SA kies?",
    groep: "beginner",
    sponsor: true,
    verwant: ["standard-bank", "firstrand"],
  },
  {
    slug: "jse-of-oorsee",
    titel: "JSE of oorsee?",
    vraag: "Moet 'n SA-belegger op die JSE of in Amerika belê?",
    groep: "beginner",
    sponsor: true,
    verwant: ["naspers", "prosus", "apple", "microsoft"],
  },
  {
    slug: "wat-is-n-dividend",
    titel: "Wat is 'n dividend?",
    vraag: "Wat is 'n dividend en wanneer kry jy dit?",
    groep: "konsep",
    sponsor: false,
    verwant: ["sasol", "standard-bank", "vodacom", "exxaro"],
  },
  {
    slug: "wat-is-n-etf",
    titel: "Wat is 'n ETF?",
    vraag: "Wat is 'n ETF en hoe verskil dit van 'n aandeel?",
    groep: "konsep",
    sponsor: false,
    verwant: ["naspers", "firstrand"],
  },
  {
    slug: "wat-is-die-top-40",
    titel: "Wat is die JSE Top 40?",
    vraag: "Wat is die JSE Top 40-indeks en wat sit daarin?",
    groep: "konsep",
    sponsor: false,
    verwant: ["naspers", "prosus", "firstrand", "anglo-american", "mtn"],
  },
  {
    slug: "wat-is-n-pe-verhouding",
    titel: "Wat is 'n P/E-verhouding?",
    vraag: "Wat beteken 'n prys-tot-verdienste-verhouding?",
    groep: "konsep",
    sponsor: false,
    verwant: ["naspers", "capitec", "sasol"],
  },
];

export function kryGids(slug: string): Gids | undefined {
  return GIDSE.find((g) => g.slug === slug.toLowerCase());
}
