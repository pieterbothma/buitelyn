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

describe("bouCsv", () => {
  const rye = [
    { epos: "een@toets.co.za", geskep_at: "2026-08-20T15:33:00.000Z", bron: "tuisblad" },
    { epos: "twee@toets.co.za", geskep_at: "2026-08-20T16:00:00.000Z", bron: null },
  ];

  it("skryf 'n kopreël en een reël per intekenaar", () => {
    const lyne = bouCsv(rye).trimEnd().split("\r\n");
    expect(lyne[0]).toBe("﻿E-pos,Ingeteken (SAST),Bron");
    expect(lyne).toHaveLength(3);
    expect(lyne[1]).toBe("een@toets.co.za,2026-08-20 17:33,tuisblad");
  });

  it("hanteer 'n ontbrekende bron as 'n leë sel", () => {
    expect(bouCsv(rye).trimEnd().split("\r\n")[2]).toBe("twee@toets.co.za,2026-08-20 18:00,");
  });

  it("begin met 'n BOM sodat Excel die leestekens reg wys", () => {
    expect(bouCsv([]).startsWith("﻿")).toBe(true);
  });
});
