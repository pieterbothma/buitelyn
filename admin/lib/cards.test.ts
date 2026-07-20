import { describe, expect, it } from "vitest";
import { cardsForDate, dueAtUtc, isoWeekday, type RecurringRule } from "./cards";

const rule = (over: Partial<RecurringRule>): RecurringRule => ({
  id: "r1",
  workspace_id: "w1",
  format_id: null,
  naam: "Toets",
  weekdae: [1, 2, 3, 4, 5],
  tyd: "09:00",
  aktief: true,
  ...over,
});

describe("cards", () => {
  it("maps SAST weekdays correctly", () => {
    // 2026-07-20 is a Monday
    expect(isoWeekday(new Date("2026-07-20T10:00:00Z"))).toBe(1);
    expect(isoWeekday(new Date("2026-07-25T10:00:00Z"))).toBe(6);
  });

  it("computes due_at as SAST wall clock in UTC", () => {
    // 09:00 SAST = 07:00 UTC
    expect(dueAtUtc(new Date("2026-07-20T00:00:00Z"), "09:00")).toBe(
      "2026-07-20T07:00:00.000Z"
    );
  });

  it("SAST date boundary: late UTC evening is already the next SAST day", () => {
    // 23:30 UTC on the 20th = 01:30 SAST on the 21st (Tuesday)
    expect(isoWeekday(new Date("2026-07-20T23:30:00Z"))).toBe(2);
  });

  it("filters rules by weekday and aktief", () => {
    const maandag = new Date("2026-07-20T06:00:00Z");
    const rules = [
      rule({ id: "a", weekdae: [1] }),
      rule({ id: "b", weekdae: [5] }),
      rule({ id: "c", weekdae: [1], aktief: false }),
    ];
    const cards = cardsForDate(maandag, rules);
    expect(cards.map((c) => c.rule_id)).toEqual(["a"]);
    expect(cards[0].titel).toBe("Toets");
  });
});
