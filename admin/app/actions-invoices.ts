"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { nextInvoiceNumber } from "@/lib/invoices";
import { loadInvoiceData } from "@/lib/invoice-data";
import { invoicePdfBuffer } from "@/lib/invoice-pdf";

export async function skepKlient(workspaceSlug: string, vorm: FormData) {
  const sb = await supabaseServer();
  const { data: ws } = await sb.from("workspaces").select("id").eq("slug", workspaceSlug).single();
  if (!ws) return;
  await sb.from("clients").insert({
    workspace_id: ws.id,
    naam: String(vorm.get("naam") ?? "").trim(),
    maatskappy: String(vorm.get("maatskappy") ?? "").trim() || null,
    reg_nr: String(vorm.get("reg_nr") ?? "").trim() || null,
    btw_nr: String(vorm.get("btw_nr") ?? "").trim() || null,
    epos: String(vorm.get("epos") ?? "").trim() || null,
    kontak: String(vorm.get("kontak") ?? "").trim() || null,
    adres: String(vorm.get("adres") ?? "").trim() || null,
  });
  revalidatePath(`/w/${workspaceSlug}/kliente`);
}

export type FaktuurLyn = { beskrywing: string; aantal: number; eenheidsprys_sent: number };

export async function skepFaktuur(input: {
  workspaceSlug: string;
  clientId: string;
  notas: string;
  lyne: FaktuurLyn[];
}) {
  const sb = await supabaseServer();
  const { data: ws } = await sb
    .from("workspaces")
    .select("id, invoice_prefix")
    .eq("slug", input.workspaceSlug)
    .single();
  if (!ws) return;
  const nommer = await nextInvoiceNumber(sb, ws.id, ws.invoice_prefix);
  const { data: faktuur } = await sb
    .from("invoices")
    .insert({
      workspace_id: ws.id,
      client_id: input.clientId,
      nommer,
      notas: input.notas || null,
    })
    .select("id")
    .single();
  if (!faktuur) return;
  await sb.from("invoice_lines").insert(
    input.lyne
      .filter((l) => l.beskrywing.trim())
      .map((l, i) => ({ ...l, invoice_id: faktuur.id, posisie: i }))
  );
  redirect(`/w/${input.workspaceSlug}/fakture/${faktuur.id}`);
}

export async function merkBetaal(id: string) {
  const sb = await supabaseServer();
  await sb
    .from("invoices")
    .update({ status: "betaal", betaal_op: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function stuurFaktuur(id: string) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  const data = await loadInvoiceData(sb, id);
  if (!data) return;
  if (!data.client.epos) return;

  const pdf = await invoicePdfBuffer(data);

  // Store a copy (service role for storage write simplicity).
  const svc = supabaseService();
  const pad = `${data.nommer}.pdf`;
  await svc.storage.from("invoice-pdfs").upload(pad, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FAKTUUR_FROM ?? "AP HQ <fakture@aitsa.tech>";
  const { error } = await resend.emails.send({
    from,
    to: data.client.epos,
    subject: `Faktuur ${data.nommer} — ${data.workspace.naam}`,
    text: `Goeie dag ${data.client.naam},\n\nAangeheg: faktuur ${data.nommer} van ${data.workspace.naam}.\n\nGroete\nAndré-Pierre du Plessis`,
    attachments: [{ filename: `${data.nommer}.pdf`, content: pdf }],
  });
  if (error) throw new Error(`Resend: ${error.message}`);

  await sb.from("invoices").update({ status: "gestuur", pdf_path: pad }).eq("id", id);
  revalidatePath("/", "layout");
}
