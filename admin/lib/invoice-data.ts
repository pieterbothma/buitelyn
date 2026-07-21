import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceData } from "@/lib/invoice-pdf";

export async function loadInvoiceData(
  sb: SupabaseClient,
  id: string
): Promise<InvoiceData | null> {
  const { data: f } = await sb
    .from("invoices")
    .select(
      "nommer, status, uitgereik_op, notas, workspace_id, workspaces(naam, accent), clients(naam, maatskappy, reg_nr, btw_nr, epos, adres), invoice_lines(beskrywing, aantal, eenheidsprys_sent, posisie)"
    )
    .eq("id", id)
    .single();
  if (!f) return null;
  const { data: settings } = await sb
    .from("entity_settings")
    .select("maatskappy, reg_nr, btw_nr, adres, terme, bank_besonderhede, logo_path")
    .eq("workspace_id", f.workspace_id)
    .maybeSingle();

  let logoDataUri: string | null = null;
  if (settings?.logo_path) {
    const { data: lêer } = await sb.storage.from("logos").download(settings.logo_path);
    if (lêer) {
      const buf = Buffer.from(await lêer.arrayBuffer());
      const mime = settings.logo_path.endsWith(".jpg") || settings.logo_path.endsWith(".jpeg")
        ? "image/jpeg"
        : "image/png";
      logoDataUri = `data:${mime};base64,${buf.toString("base64")}`;
    }
  }

  const ws = f.workspaces as unknown as { naam: string; accent: string };
  const kl = f.clients as unknown as {
    naam: string;
    maatskappy: string | null;
    reg_nr: string | null;
    btw_nr: string | null;
    epos: string | null;
    adres: string | null;
  };
  return {
    nommer: f.nommer,
    uitgereik_op: f.uitgereik_op,
    status: f.status,
    notas: f.notas,
    workspace: ws,
    client: kl,
    lines: (f.invoice_lines ?? []).sort((a, b) => a.posisie - b.posisie),
    bank_besonderhede: settings?.bank_besonderhede ?? null,
    logoDataUri,
    verkoper: {
      maatskappy: settings?.maatskappy ?? null,
      reg_nr: settings?.reg_nr ?? null,
      btw_nr: settings?.btw_nr ?? null,
      adres: settings?.adres ?? null,
    },
    terme: settings?.terme ?? null,
  };
}
