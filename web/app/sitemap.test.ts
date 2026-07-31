import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { GIDSE } from "@/lib/gidse";

describe("sitemap", () => {
  it("bevat die gids-indeks en elke gids", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://www.buitelyn.com/gidse");
    for (const g of GIDSE) {
      expect(urls).toContain(`https://www.buitelyn.com/gidse/${g.slug}`);
    }
  });

  it("bevat steeds die aandeelblaaie", () => {
    expect(sitemap().map((e) => e.url)).toContain("https://www.buitelyn.com/aandele/sasol");
  });
});
