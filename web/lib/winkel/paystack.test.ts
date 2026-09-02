import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { webhookGeldig } from "./paystack";

describe("webhookGeldig", () => {
  const geheim = "sk_test_abc"; const lyf = JSON.stringify({ event: "charge.success" });
  it("aanvaar die regte HMAC-SHA512", () => {
    const teken = createHmac("sha512", geheim).update(lyf).digest("hex");
    expect(webhookGeldig(lyf, teken, geheim)).toBe(true);
  });
  it("weier 'n verkeerde of ontbrekende handtekening", () => {
    expect(webhookGeldig(lyf, "deadbeef", geheim)).toBe(false);
    expect(webhookGeldig(lyf, null, geheim)).toBe(false);
  });
});
