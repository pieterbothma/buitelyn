import type { MetadataRoute } from "next";
import { AANDELE } from "@/lib/aandele";

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
  ];
}
