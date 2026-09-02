import { describe, expect, it } from "vitest";
import { koperEposHtml, eienaarEposHtml, spoorEposHtml, eienaarOnderwerp, spoorOnderwerp, type BestellingRy } from "./epos";

const b: BestellingRy = {
  verwysing: "BL-TOETS-1",
  items: [
    { variant_id: "3f1c0e5e-0000-0000-0000-000000000001", naam: "Seepunt-pet", kleur: "Seegroen", grootte: null, prys_sent: 25000, aantal: 2,
      foto: "https://buitelyn.com/winkel/pet-af871d.jpg" },
    { variant_id: "3f1c0e5e-0000-0000-0000-000000000002", naam: "Buitelyn-trui", kleur: "Swart", grootte: "L", prys_sent: 59900, aantal: 1 },
  ],
  koper: { naam: "Jan", van: "Smit", epos: "jan@example.com", selfoon: "0821234567" },
  adres: { straat: "Kerkstraat 1", woonbuurt: "Gardens", stad: "Kaapstad",
           provinsie: "Wes-Kaap", poskode: "8001", nota: "" },
  item_sent: 109900, versending_sent: 9900, totaal_sent: 119800,
  modus: "toets",
};
describe("bestelling-eposse", () => {
  it("koper-epos het nommer, lynitems met foto's, bedrae, adres, lewertyd en regte", () => {
    const h = koperEposHtml(b);
    for (const stuk of ["BL-TOETS-1", "R1198,00", "R500,00", "R599,00", "Kerkstraat 1",
      "5 tot 7 werksdae", "/kansellasie", "Promenader (Pty) Ltd",
      "Seepunt-pet", "Seegroen", "2 stuks", "Buitelyn-trui", "Swart", "1 stuk"]) expect(h).toContain(stuk);
    /* Die vasgevangde foto verskyn as 'n <img>; 'n lyn sonder foto kry 'n plekhouer-blok. */
    expect(h).toContain('src="https://buitelyn.com/winkel/pet-af871d.jpg"');
    expect((h.match(/<img /g) ?? []).length).toBe(1);
  });
  it("eienaar-epos het die volle afleweringsadres, selfoon en lynitems", () => {
    const h = eienaarEposHtml(b);
    for (const stuk of ["0821234567", "8001", "Wes-Kaap", "Seepunt-pet", "Buitelyn-trui", "R1198,00"]) expect(h).toContain(stuk);
  });
  it("eienaar-onderwerp kry 'n [TOETS]-voorvoegsel in toets-modus, koper-epos bly onaangeraak", () => {
    expect(eienaarOnderwerp(b)).toBe("[TOETS] Nuwe winkelbestelling BL-TOETS-1");
    expect(eienaarOnderwerp({ ...b, modus: undefined })).toBe("Nuwe winkelbestelling BL-TOETS-1");
    expect(eienaarOnderwerp({ ...b, modus: "regte" })).toBe("Nuwe winkelbestelling BL-TOETS-1");
    expect(koperEposHtml(b)).not.toContain("[TOETS]");
  });
});

describe("spoor-epos", () => {
  it("met koerier en spoornommer: albei verskyn, plus die items en adres", () => {
    const h = spoorEposHtml(b, "The Courier Guy", "TCG123456789");
    for (const stuk of ["op pad met The Courier Guy", "SPOORNOMMER", "TCG123456789",
      "Seepunt-pet", "Kerkstraat 1", "BL-TOETS-1"]) expect(h).toContain(stuk);
  });
  it("sonder koerier/spoornommer: die sin pas aan en geen leë spoorblok nie", () => {
    const h = spoorEposHtml(b, null, null);
    expect(h).toContain("Jou bestelling is op pad.");
    expect(h).not.toContain("SPOORNOMMER");
  });
  it("onderwerp dra die [TOETS]-merker net in toets-modus", () => {
    expect(spoorOnderwerp(b)).toBe("[TOETS] Buitelyn — jou bestelling BL-TOETS-1 is op pad");
    expect(spoorOnderwerp({ ...b, modus: "regte" })).toBe("Buitelyn — jou bestelling BL-TOETS-1 is op pad");
  });
});
