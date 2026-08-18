import type { MetadataRoute } from "next";
import { AANDELE } from "@/lib/aandele";

export default function sitemap(): MetadataRoute.Sitemap {
  const nou = new Date();
  return [
    { url: "https://www.buitelyn.com", lastModified: nou, changeFrequency: "daily", priority: 1 },
    { url: "https://www.buitelyn.com/aandele", lastModified: nou, changeFrequency: "daily", priority: 0.9 },
    /* Die wetlike bladsye verander selde, maar hulle moet indekseerbaar wees:
       'n koper (en 'n betalingsverskaffer se nasiener) moet hulle kan vind
       sonder om deur die voetstuk te soek. */
    ...["voorwaardes", "terugbetalings", "kansellasie"].map((r) => ({
      url: `https://www.buitelyn.com/${r}`,
      lastModified: nou,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...AANDELE.map((a) => ({
      url: `https://www.buitelyn.com/aandele/${a.slug}`,
      lastModified: nou,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
