import { describe, expect, it } from "vitest";
import { koperEposHtml, eienaarEposHtml, type BestellingRy } from "./epos";

const b: BestellingRy = {
  verwysing: "BL-TOETS-1",
  item: { naam: "Seepunt-pet", kleur: "Seegroen", prys_sent: 25000, aantal: 2 },
  koper: { naam: "Jan", van: "Smit", epos: "jan@example.com", selfoon: "0821234567" },
  adres: { straat: "Kerkstraat 1", woonbuurt: "Gardens", stad: "Kaapstad",
           provinsie: "Wes-Kaap", poskode: "8001", nota: "" },
  item_sent: 50000, versending_sent: 9900, totaal_sent: 59900,
};
describe("bestelling-eposse", () => {
  it("koper-epos het nommer, bedrag, adres, lewertyd en regte", () => {
    const h = koperEposHtml(b);
    for (const stuk of ["BL-TOETS-1", "R599,00", "Kerkstraat 1", "5 tot 7 werksdae",
      "/kansellasie", "Promenader (Pty) Ltd", "Seegroen"]) expect(h).toContain(stuk);
  });
  it("eienaar-epos het die volle afleweringsadres en selfoon", () => {
    const h = eienaarEposHtml(b);
    for (const stuk of ["0821234567", "8001", "Wes-Kaap", "2 x Seepunt-pet"]) expect(h).toContain(stuk);
  });
});
