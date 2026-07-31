import type { MetadataRoute } from "next";
import { AANDELE } from "@/lib/aandele";
import { GIDSE } from "@/lib/gidse";

export default function sitemap(): MetadataRoute.Sitemap {
  const nou = new Date();
  return [
    { url: "https://www.buitelyn.com", lastModified: nou, changeFrequency: "daily", priority: 1 },
    { url: "https://www.buitelyn.com/aandele", lastModified: nou, changeFrequency: "daily", priority: 0.9 },
    ...AANDELE.map((a) => ({
      url: `https://www.buitelyn.com/aandele/${a.slug}`,
      lastModified: nou,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: "https://www.buitelyn.com/gidse", lastModified: nou, changeFrequency: "weekly", priority: 0.7 },
    ...GIDSE.map((g) => ({
      url: `https://www.buitelyn.com/gidse/${g.slug}`,
      lastModified: nou,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
