import { describe, expect, it } from "vitest";
import { koperEposHtml, eienaarEposHtml, eienaarOnderwerp, type BestellingRy } from "./epos";

const b: BestellingRy = {
  verwysing: "BL-TOETS-1",
  items: [
    { variant_id: "3f1c0e5e-0000-0000-0000-000000000001", naam: "Seepunt-pet", kleur: "Seegroen", grootte: null, prys_sent: 25000, aantal: 2 },
    { variant_id: "3f1c0e5e-0000-0000-0000-000000000002", naam: "Buitelyn-trui", kleur: "Swart", grootte: "L", prys_sent: 59900, aantal: 1 },
  ],
  koper: { naam: "Jan", van: "Smit", epos: "jan@example.com", selfoon: "0821234567" },
  adres: { straat: "Kerkstraat 1", woonbuurt: "Gardens", stad: "Kaapstad",
           provinsie: "Wes-Kaap", poskode: "8001", nota: "" },
  item_sent: 109900, versending_sent: 9900, totaal_sent: 119800,
  modus: "toets",
};
describe("bestelling-eposse", () => {
  it("koper-epos het nommer, bedrag, adres, lewertyd en regte", () => {
    const h = koperEposHtml(b);
    for (const stuk of ["BL-TOETS-1", "R1198,00", "Kerkstraat 1", "5 tot 7 werksdae",
      "/kansellasie", "Promenader (Pty) Ltd", "2 x Seepunt-pet", "Buitelyn-trui (Swart, L)"]) expect(h).toContain(stuk);
  });
  it("eienaar-epos het die volle afleweringsadres en selfoon", () => {
    const h = eienaarEposHtml(b);
    for (const stuk of ["0821234567", "8001", "Wes-Kaap", "2 x Seepunt-pet", "Buitelyn-trui (Swart, L)"]) expect(h).toContain(stuk);
  });
  it("eienaar-onderwerp kry 'n [TOETS]-voorvoegsel in toets-modus, koper-epos bly onaangeraak", () => {
    expect(eienaarOnderwerp(b)).toBe("[TOETS] Nuwe winkelbestelling BL-TOETS-1");
    expect(eienaarOnderwerp({ ...b, modus: undefined })).toBe("Nuwe winkelbestelling BL-TOETS-1");
    expect(eienaarOnderwerp({ ...b, modus: "regte" })).toBe("Nuwe winkelbestelling BL-TOETS-1");
    expect(koperEposHtml(b)).not.toContain("[TOETS]");
  });
});
