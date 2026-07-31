import { describe, expect, it } from "vitest";
import { magVermeld } from "./sponsor-vermelding";
import { kryGids } from "@/lib/gidse";

describe("magVermeld — subtiliteit is struktureel, nie 'n belofte nie", () => {
  it("laat die borg toe op 'n beginnergids met konteks", () => {
    expect(magVermeld(kryGids("hoe-om-aandele-te-koop")!, "EasyEquities is een so 'n platform.")).toBe(true);
  });

  it("weier op 'n konsepgids, selfs al gee iemand konteks", () => {
    expect(magVermeld(kryGids("wat-is-n-dividend")!, "EasyEquities is een so 'n platform.")).toBe(false);
  });

  it("weier wanneer daar geen konteks is nie", () => {
    expect(magVermeld(kryGids("hoe-om-aandele-te-koop")!, null)).toBe(false);
    expect(magVermeld(kryGids("hoe-om-aandele-te-koop")!, "   ")).toBe(false);
  });
});
