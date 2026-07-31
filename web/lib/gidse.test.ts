import { describe, expect, it } from "vitest";
import { GIDSE, kryGids } from "./gidse";
import { AANDELE } from "./aandele";

describe("GIDSE-katalogus", () => {
  it("het vier beginnergidse en vier konsepgidse", () => {
    expect(GIDSE.filter((g) => g.groep === "beginner")).toHaveLength(4);
    expect(GIDSE.filter((g) => g.groep === "konsep")).toHaveLength(4);
  });

  it("wys die sponsor net op beginnergidse", () => {
    expect(GIDSE.filter((g) => g.sponsor).map((g) => g.groep)).toEqual(
      ["beginner", "beginner", "beginner", "beginner"]
    );
  });

  it("het URL-veilige slugs — geen apostrowwe, aksente of hoofletters", () => {
    for (const g of GIDSE) expect(g.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("verwys net na aandeel-slugs wat werklik bestaan", () => {
    const bestaan = new Set(AANDELE.map((a) => a.slug));
    for (const g of GIDSE) {
      for (const slug of g.verwant) expect(bestaan.has(slug), `${g.slug} → ${slug}`).toBe(true);
    }
  });

  it("kryGids vind op slug, hoofletter-onsensitief", () => {
    expect(kryGids("WAT-IS-N-DIVIDEND")?.groep).toBe("konsep");
    expect(kryGids("bestaan-nie")).toBeUndefined();
  });
});
