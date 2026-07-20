import { describe, expect, it } from "vitest";
import { buildInvoiceNumber, formatRand, invoiceTotalSent } from "./invoices";

describe("invoices", () => {
  it("formats rand with space thousands and comma decimals", () => {
    expect(formatRand(500000)).toBe("R 5 000,00");
    expect(formatRand(123456789)).toBe("R 1 234 567,89");
    expect(formatRand(50)).toBe("R 0,50");
  });

  it("sums line totals with quantities", () => {
    expect(
      invoiceTotalSent([
        { aantal: 3, eenheidsprys_sent: 150000 },
        { aantal: 1.5, eenheidsprys_sent: 100000 },
      ])
    ).toBe(600000);
  });

  it("builds padded per-entity numbers", () => {
    expect(buildInvoiceNumber("BUI", 2026, 7)).toBe("BUI-2026-007");
    expect(buildInvoiceNumber("PRO", 2027, 123)).toBe("PRO-2027-123");
  });
});
