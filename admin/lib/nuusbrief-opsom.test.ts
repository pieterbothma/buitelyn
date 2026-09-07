import { describe, expect, it } from "vitest";
import { bouCsv, csvVeld, sastTyd, vensterVanaf } from "./nuusbrief-opsom";

describe("vensterVanaf", () => {
  it("gaan presies 24 uur terug", () => {
    expect(vensterVanaf(new Date("2026-08-21T18:00:00.000Z"))).toBe("2026-08-20T18:00:00.000Z");
  });
});

describe("sastTyd", () => {
  it("wys SAST, nie UTC nie", () => {
    // 15:33 UTC is 17:33 in Johannesburg.
    expect(sastTyd("2026-08-20T15:33:00.000Z")).toBe("2026-08-20 17:33");
  });

  it("gee 'n leë string vir 'n stukkende datum eerder as 'Invalid Date'", () => {
    expect(sastTyd("gister")).toBe("");
  });
});

describe("csvVeld", () => {
  it("los 'n gewone adres met rus", () => {
    expect(csvVeld("piet@aitsa.tech")).toBe("piet@aitsa.tech");
  });

  it("vou 'n veld met 'n komma toe", () => {
    // Sonder dit skuif elke kolom daarna een plek op.
    expect(csvVeld("Bekker, QS")).toBe('"Bekker, QS"');
  });

  it("verdubbel 'n aanhalingsteken binne die veld", () => {
    expect(csvVeld('hy sê "hallo"')).toBe('"hy sê ""hallo"""');
  });
});

describe("bouCsv — Substack se invoerformaat", () => {
  const rye = [
    { epos: "een@toets.co.za", geskep_at: "2026-08-20T15:33:00.000Z", bron: "tuisblad" },
    { epos: "twee@toets.co.za", geskep_at: "2026-08-20T16:00:00.000Z", bron: null },
  ];

  it("skryf net 'n email-kolom", () => {
    expect(bouCsv(rye)).toBe("email\r\neen@toets.co.za\r\ntwee@toets.co.za\r\n");
  });

  it("het GEEN BOM nie — Substack lees die kop letterlik", () => {
    // Met 'n BOM heet die kolom "\ufeffemail" en die invoerder kry niks.
    expect(bouCsv(rye).startsWith("\ufeff")).toBe(false);
    expect(bouCsv(rye).startsWith("email")).toBe(true);
  });

  it("gee net die kop terug wanneer daar niemand is nie", () => {
    expect(bouCsv([])).toBe("email\r\n");
  });
});
