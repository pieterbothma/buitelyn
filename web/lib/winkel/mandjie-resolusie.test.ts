import { describe, expect, it } from "vitest";
import { mandjieOpsomming, type MandjieVariantRy } from "./mandjie-resolusie";

const A = "3f1c0e5e-0000-0000-0000-000000000001",
  B = "3f1c0e5e-0000-0000-0000-000000000002",
  C = "3f1c0e5e-0000-0000-0000-000000000003",
  D = "3f1c0e5e-0000-0000-0000-000000000004";

function variant(oor: Partial<MandjieVariantRy>): MandjieVariantRy {
  return {
    id: A,
    kleur: "Kakie",
    grootte: null,
    voorraad: 10,
    aktief: true,
    winkel_produkte: { naam: "Seepunt-pet", prys_sent: 25000, fotos: [], aktief: true },
    ...oor,
  };
}

describe("mandjieOpsomming — enkel-lyn state-tabel", () => {
  it.each([
    {
      naam: "beskikbaar: genoeg voorraad",
      variante: { [A]: variant({ voorraad: 10 }) },
      items: [{ variantId: A, aantal: 2 }],
      verwag: { status: "beskikbaar", kortVoorraad: false, itemSent: 50000, alleBeskikbaar: true },
    },
    {
      naam: "kort voorraad: minder as aangevra maar > 0 — bly beskikbaar",
      variante: { [A]: variant({ voorraad: 1 }) },
      items: [{ variantId: A, aantal: 3 }],
      verwag: { status: "beskikbaar", kortVoorraad: true, itemSent: 75000, alleBeskikbaar: true },
    },
    {
      naam: "uitverkoop: voorraad === 0 — onbeskikbaar vir betaal",
      variante: { [A]: variant({ voorraad: 0 }) },
      items: [{ variantId: A, aantal: 2 }],
      verwag: { status: "uitverkoop", kortVoorraad: undefined, itemSent: 0, alleBeskikbaar: false },
    },
    {
      naam: "onaktiewe variant — nie meer beskikbaar",
      variante: { [A]: variant({ voorraad: 5, aktief: false }) },
      items: [{ variantId: A, aantal: 1 }],
      verwag: { status: "onbeskikbaar", kortVoorraad: undefined, itemSent: 0, alleBeskikbaar: false },
    },
    {
      naam: "onaktiewe produk — nie meer beskikbaar",
      variante: {
        [A]: variant({ voorraad: 5, winkel_produkte: { naam: "X", prys_sent: 1000, fotos: [], aktief: false } }),
      },
      items: [{ variantId: A, aantal: 1 }],
      verwag: { status: "onbeskikbaar", kortVoorraad: undefined, itemSent: 0, alleBeskikbaar: false },
    },
    {
      naam: "verdwene variant (nie in die kaart nie) — nie meer beskikbaar",
      variante: {},
      items: [{ variantId: A, aantal: 1 }],
      verwag: { status: "onbeskikbaar", kortVoorraad: undefined, itemSent: 0, alleBeskikbaar: false },
    },
  ])("$naam", ({ variante, items, verwag }) => {
    const { lyne, itemSent, alleBeskikbaar } = mandjieOpsomming(items, variante);
    expect(lyne).toHaveLength(1);
    expect(lyne[0].status).toBe(verwag.status);
    expect(lyne[0].kortVoorraad).toBe(verwag.kortVoorraad);
    expect(itemSent).toBe(verwag.itemSent);
    expect(alleBeskikbaar).toBe(verwag.alleBeskikbaar);
  });

  it("gemeng: beskikbaar + kort-voorraad + uitverkoop + onbeskikbaar in een mandjie", () => {
    const variante: Record<string, MandjieVariantRy> = {
      [A]: variant({ id: A, voorraad: 10 }), // beskikbaar
      [B]: variant({ id: B, voorraad: 1 }), // kort voorraad, bly beskikbaar
      [C]: variant({ id: C, voorraad: 0 }), // uitverkoop
      // D bestaan doelbewus nie in die kaart nie — onbeskikbaar
    };
    const items = [
      { variantId: A, aantal: 2 }, // 2 x 25000 = 50000
      { variantId: B, aantal: 3 }, // 3 x 25000 = 75000 (kort voorraad, tel steeds)
      { variantId: C, aantal: 1 }, // uitverkoop — tel nie
      { variantId: D, aantal: 1 }, // onbeskikbaar — tel nie
    ];

    const { lyne, itemSent, alleBeskikbaar } = mandjieOpsomming(items, variante);

    expect(lyne.map((l) => l.status)).toEqual(["beskikbaar", "beskikbaar", "uitverkoop", "onbeskikbaar"]);
    expect(lyne[1].kortVoorraad).toBe(true);
    expect(itemSent).toBe(125000);
    expect(alleBeskikbaar).toBe(false);
  });

  it("leë mandjie: alleBeskikbaar is false (niks om te betaal nie)", () => {
    const { lyne, itemSent, alleBeskikbaar } = mandjieOpsomming([], {});
    expect(lyne).toEqual([]);
    expect(itemSent).toBe(0);
    expect(alleBeskikbaar).toBe(false);
  });
});
