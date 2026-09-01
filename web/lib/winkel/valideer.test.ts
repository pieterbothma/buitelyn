import { describe, expect, it } from "vitest";
import { valideerBestelling, PROVINSIES, VERSENDING_SENT } from "./valideer";

const goed = {
  variantId: "3f1c0e5e-0000-0000-0000-000000000001", aantal: 1,
  koper: { naam: "Jan", van: "Smit", epos: "jan@example.com", selfoon: "0821234567" },
  adres: { straat: "Kerkstraat 1", woonbuurt: "Gardens", stad: "Kaapstad",
           provinsie: "Wes-Kaap", poskode: "8001", nota: "" },
};
describe("valideerBestelling", () => {
  it("aanvaar 'n geldige bestelling", () => {
    const r = valideerBestelling(goed);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.adres.provinsie).toBe("Wes-Kaap");
  });
  it("weier 'n slegte selfoon", () => {
    expect(valideerBestelling({ ...goed, koper: { ...goed.koper, selfoon: "123" } }).ok).toBe(false);
  });
  it("aanvaar selfoon met spasies net voor afkap", () => {
    expect(valideerBestelling({ ...goed, koper: { ...goed.koper, selfoon: "+27 82 123 45 67" } }).ok).toBe(true);
  });
  it("weier 'n onbekende provinsie en 'n slegte poskode", () => {
    expect(valideerBestelling({ ...goed, adres: { ...goed.adres, provinsie: "Narnia" } }).ok).toBe(false);
    expect(valideerBestelling({ ...goed, adres: { ...goed.adres, poskode: "80" } }).ok).toBe(false);
  });
  it("begrens aantal tot 1..5 en knip spasies", () => {
    expect(valideerBestelling({ ...goed, aantal: 0 }).ok).toBe(false);
    expect(valideerBestelling({ ...goed, aantal: 6 }).ok).toBe(false);
    const r = valideerBestelling({ ...goed, koper: { ...goed.koper, naam: "  Jan  " } });
    if (r.ok) expect(r.data.koper.naam).toBe("Jan");
  });
  it("konstantes", () => { expect(PROVINSIES).toHaveLength(9); expect(VERSENDING_SENT).toBe(9900); });
});
