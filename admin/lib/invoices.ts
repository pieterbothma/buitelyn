import type { SupabaseClient } from "@supabase/supabase-js";

/** Format cents as South African rand: 500000 -> "R 5 000,00". */
export function formatRand(sent: number | bigint): string {
  const n = Number(sent) / 100;
  return (
    "R " +
    new Intl.NumberFormat("af-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(n)
      .replace(/ /g, " ")
  );
}

export function invoiceTotalSent(lines: { aantal: number; eenheidsprys_sent: number }[]): number {
  return lines.reduce((som, l) => som + Math.round(l.aantal * l.eenheidsprys_sent), 0);
}

export function buildInvoiceNumber(prefix: string, jaar: number, volgende: number): string {
  return `${prefix}-${jaar}-${String(volgende).padStart(3, "0")}`;
}

/** Claim the next number for a workspace (year rollover resets to 1). */
export async function nextInvoiceNumber(
  sb: SupabaseClient,
  workspaceId: string,
  prefix: string,
  nou = new Date()
): Promise<string> {
  const jaar = nou.getFullYear();
  const { data: teller } = await sb
    .from("invoice_counters")
    .select("jaar, volgende")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const volgende = teller && teller.jaar === jaar ? teller.volgende : 1;
  await sb
    .from("invoice_counters")
    .upsert({ workspace_id: workspaceId, jaar, volgende: volgende + 1 });
  return buildInvoiceNumber(prefix, jaar, volgende);
}
