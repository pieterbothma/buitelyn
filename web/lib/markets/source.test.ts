import { describe, expect, it } from "vitest";
import { berekenDelta, normaliseerPrys } from "./source";
import { ALLE_SIMBOLE, jseIsOop, naamVirSimbool } from "./boards";

describe("markets source", () => {
  it("converts JSE ZAc (cents) to rand", () => {
    expect(normaliseerPrys(78960, "ZAc")).toEqual({ prys: 789.6, geldeenheid: "ZAR" });
    expect(normaliseerPrys(16.82, "ZAR")).toEqual({ prys: 16.82, geldeenheid: "ZAR" });
    expect(normaliseerPrys(1604.1, "USD")).toEqual({ prys: 1604.1, geldeenheid: "USD" });
  });

  it("computes day delta percent", () => {
    expect(berekenDelta(110, 100)).toBeCloseTo(10);
    expect(berekenDelta(95, 100)).toBeCloseTo(-5);
    expect(berekenDelta(100, null)).toBeNull();
    expect(berekenDelta(100, 0)).toBeNull();
  });

  it("boards have unique symbols and resolvable names", () => {
    expect(new Set(ALLE_SIMBOLE).size).toBe(ALLE_SIMBOLE.length);
    expect(naamVirSimbool("NPN.JO")).toBe("Naspers");
    expect(naamVirSimbool("ONBEKEND")).toBe("ONBEKEND");
  });

  it("JSE market hours in SAST", () => {
    // Wed 2026-07-22 10:00 SAST = 08:00 UTC
    expect(jseIsOop(new Date("2026-07-22T08:00:00Z"))).toBe(true);
    // Wed 18:00 SAST = 16:00 UTC
    expect(jseIsOop(new Date("2026-07-22T16:00:00Z"))).toBe(false);
    // Saturday
    expect(jseIsOop(new Date("2026-07-25T08:00:00Z"))).toBe(false);
  });
});

import { isGeldigeSimbool } from "./boards";

describe("isGeldigeSimbool", () => {
  it("aanvaar Yahoo-simboolvorme", () => {
    for (const s of ["SNT.JO", "AAPL", "ZAR=X", "^GSPC", "BTC-ZAR", "GC=F"]) {
      expect(isGeldigeSimbool(s)).toBe(true);
    }
  });
  it("verwerp gemors en injektie-agtige strings", () => {
    for (const s of ["", "snt.jo", "TE LANK SIMBOOL", "A;DROP", "-AAPL", "A".repeat(13)]) {
      expect(isGeldigeSimbool(s)).toBe(false);
    }
  });
});
