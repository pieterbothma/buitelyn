import { describe, expect, it, beforeEach } from "vitest";
import { kiesStem, STEM_NAME } from "./stemme";

describe("kiesStem", () => {
  beforeEach(() => {
    process.env.ELEVENLABS_VOICE_ID = "alida-id-uit-env";
  });

  it("gee Alida se ID vir 'alida'", () => {
    expect(kiesStem("Alida")).toBe("alida-id-uit-env");
  });

  it("gee Akker se vaste ID vir 'akker'", () => {
    expect(kiesStem("Akker")).toBe("LG95yZDEHg6fCZdQjLqj");
  });

  it("val terug op Alida wanneer niks gestuur is nie", () => {
    // Die drie bestaande oproepers stuur geen stem nie en moet aanhou werk.
    expect(kiesStem()).toBe("alida-id-uit-env");
  });

  it("val terug op Alida by 'n onbekende naam", () => {
    // Liewer die verkeerde stem as 'n mislukte generasie.
    expect(kiesStem("gerhard")).toBe("alida-id-uit-env");
  });

  it("wys die kaart se name vir die kieser", () => {
    expect(STEM_NAME).toEqual(["Alida", "Gerhard", "Sarie", "Seuna", "Britney", "Lanie", "Akker"]);
  });
});

describe("Koedoe se huisstemme", () => {
  it("los elke huisnaam op na sy ID", () => {
    expect(kiesStem("Gerhard")).toBe("dSByRdUbTGloB7TFA1qD");
    expect(kiesStem("Sarie")).toBe("h2dQOVyUfIDqY2whPOMo");
    expect(kiesStem("Seuna")).toBe("34lPwSZ54D8fWbX1aHzk");
    expect(kiesStem("Britney")).toBe("kPzsL2i3teMYv0FxEYQ6");
    expect(kiesStem("Lanie")).toBe("EQu48Nbp4OqDxsnYh27f");
  });

  it("Alida bly eerste, want die kieser se verstek is STEM_NAME[0]", () => {
    expect(STEM_NAME[0]).toBe("Alida");
  });

  it("wys Rachel NIE apart nie — dis dieselfde stem as Alida", () => {
    // aD6riP1btT197c6dACmy is albei; twee inskrywings sou dieselfde stem twee
    // keer in die keuselys sit.
    expect(STEM_NAME).not.toContain("Rachel");
  });
});

