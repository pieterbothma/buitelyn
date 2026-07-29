import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/profiel", "/auth/"] }],
    sitemap: "https://www.buitelyn.com/sitemap.xml",
  };
}
