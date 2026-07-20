export type RecurringRule = {
  id: string;
  workspace_id: string;
  format_id: string | null;
  naam: string;
  weekdae: number[]; // ISO: 1=Ma … 7=So
  tyd: string; // "HH:MM" or "HH:MM:SS"
  aktief: boolean;
};

export type NewCard = {
  workspace_id: string;
  format_id: string | null;
  rule_id: string;
  titel: string;
  due_at: string; // ISO UTC
};

const TZ = "Africa/Johannesburg"; // UTC+2, no DST

/** ISO weekday (1=Mon…7=Sun) of a calendar date in SAST. */
export function isoWeekday(datum: Date): number {
  const naam = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: TZ }).format(datum);
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[naam as "Mon"]!;
}

/** UTC instant for SAST wall-clock `tyd` on `datum`'s SAST calendar date. */
export function dueAtUtc(datum: Date, tyd: string): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(datum); // YYYY-MM-DD
  const [uur, minuut] = tyd.split(":").map(Number);
  // SAST is fixed UTC+2
  const utc = Date.UTC(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(5, 7)) - 1,
    Number(ymd.slice(8, 10)),
    uur - 2,
    minuut
  );
  return new Date(utc).toISOString();
}

/** Cards that should exist for `datum` given the active rules. Pure; idempotency
    comes from the DB unique (rule_id, due_at). */
export function cardsForDate(datum: Date, rules: RecurringRule[]): NewCard[] {
  const dag = isoWeekday(datum);
  return rules
    .filter((r) => r.aktief && r.weekdae.includes(dag))
    .map((r) => ({
      workspace_id: r.workspace_id,
      format_id: r.format_id,
      rule_id: r.id,
      titel: r.naam,
      due_at: dueAtUtc(datum, r.tyd),
    }));
}
