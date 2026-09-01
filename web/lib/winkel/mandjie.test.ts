import { describe, expect, it } from "vitest";
import { voegBy, verwyder, stelAantal, telling } from "./mandjie";

const A = "3f1c0e5e-0000-0000-0000-000000000001",
  B = "3f1c0e5e-0000-0000-0000-000000000002";

describe("mandjie-helpers", () => {
  it("voeg by en smelt duplikate saam, geklem op 5", () => {
    let l = voegBy([], A, 2);
    l = voegBy(l, A, 4);
    expect(l).toEqual([{ variantId: A, aantal: 5 }]);
  });

  it("verwyder en stel aantal (0 verwyder)", () => {
    let l = voegBy(voegBy([], A, 1), B, 2);
    expect(verwyder(l, A)).toEqual([{ variantId: B, aantal: 2 }]);
    expect(stelAantal(l, B, 0)).toEqual([{ variantId: A, aantal: 1 }]);
  });

  it("telling som die aantalle", () => {
    expect(telling(voegBy(voegBy([], A, 2), B, 3))).toBe(5);
  });
});
