import { describe, expect, it, vi } from "vitest";
import { GIDSE } from "@/lib/gidse";

describe("sitemap", () => {
  it("bevat die gids-indeks en elke gids (vandag het al 8 katalogus-inskrywings inhoud)", async () => {
    const { default: sitemap } = await import("./sitemap");
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://www.buitelyn.com/gidse");
    for (const g of GIDSE) {
      expect(urls).toContain(`https://www.buitelyn.com/gidse/${g.slug}`);
    }
  });

  it("bevat steeds die aandeelblaaie", async () => {
    const { default: sitemap } = await import("./sitemap");
    expect(sitemap().map((e) => e.url)).toContain("https://www.buitelyn.com/aandele/sasol");
  });

  it("sluit 'n gids sonder inhoud uit — /gidse/[slug] het dynamicParams=false en sou 404 gee", async () => {
    // 'n toekomstige gids wat in die katalogus geskep is voordat sy inhoud-JSON
    // bestaan, mag nooit in die sitemap beland nie (sien index.tsx en
    // [slug]/page.tsx wat dieselfde INHOUD[g.slug]-filter gebruik).
    vi.resetModules();
    vi.doMock("@/lib/gidse", async (orig) => {
      const mod = await orig<typeof import("@/lib/gidse")>();
      return {
        ...mod,
        GIDSE: [...mod.GIDSE, { slug: "nog-nie-geskryf-nie", titel: "x", vraag: "x", groep: "konsep", sponsor: false, verwant: [] }],
      };
    });
    const { default: sitemap } = await import("./sitemap");
    const urls = sitemap().map((e) => e.url);
    expect(urls).not.toContain("https://www.buitelyn.com/gidse/nog-nie-geskryf-nie");
    vi.doUnmock("@/lib/gidse");
    vi.resetModules();
  });
});
