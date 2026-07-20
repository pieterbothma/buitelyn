import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceData } from "@/lib/invoice-pdf";

export async function loadInvoiceData(
  sb: SupabaseClient,
  id: string
): Promise<InvoiceData | null> {
  const { data: f } = await sb
    .from("invoices")
    .select(
      "nommer, status, uitgereik_op, notas, workspace_id, workspaces(naam, accent), clients(naam, epos, adres), invoice_lines(beskrywing, aantal, eenheidsprys_sent, posisie)"
    )
    .eq("id", id)
    .single();
  if (!f) return null;
  const { data: settings } = await sb
    .from("entity_settings")
    .select("bank_besonderhede")
    .eq("workspace_id", f.workspace_id)
    .maybeSingle();
  const ws = f.workspaces as unknown as { naam: string; accent: string };
  const kl = f.clients as unknown as { naam: string; epos: string | null; adres: string | null };
  return {
    nommer: f.nommer,
    uitgereik_op: f.uitgereik_op,
    status: f.status,
    notas: f.notas,
    workspace: ws,
    client: kl,
    lines: (f.invoice_lines ?? []).sort((a, b) => a.posisie - b.posisie),
    bank_besonderhede: settings?.bank_besonderhede ?? null,
  };
}
