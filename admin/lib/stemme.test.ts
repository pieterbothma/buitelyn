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
    expect(STEM_NAME).toEqual(["Alida", "Akker"]);
  });
});
