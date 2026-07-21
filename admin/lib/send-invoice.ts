import { Resend } from "resend";
import { supabaseService } from "@/lib/supabase/service";
import { loadInvoiceData } from "@/lib/invoice-data";
import { invoicePdfBuffer } from "@/lib/invoice-pdf";
import { skryfAfrikaans } from "@/lib/gemini";

/** Send an invoice by email (service role — callers must have verified the
    actor: an authed server action, or the Telegram webhook's user check). */
export async function sendInvoiceEmail(invoiceId: string): Promise<{ ok?: true; fout?: string }> {
  const svc = supabaseService();
  const data = await loadInvoiceData(svc, invoiceId);
  if (!data) return { fout: "Faktuur nie gevind nie" };
  if (!data.client.epos) return { fout: "Kliënt het geen e-posadres nie" };

  const pdf = await invoicePdfBuffer(data);
  const pad = `${data.nommer}.pdf`;
  await svc.storage.from("invoice-pdfs").upload(pad, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  // Auto-file into the workspace's Fakture folder (once per invoice).
  const { data: faktuur } = await svc
    .from("invoices")
    .select("workspace_id")
    .eq("id", invoiceId)
    .single();
  if (faktuur) {
    const { data: bestaan } = await svc
      .from("documents")
      .select("id")
      .eq("bucket", "invoice-pdfs")
      .eq("path", pad)
      .maybeSingle();
    if (!bestaan) {
      await svc.from("documents").insert({
        workspace_id: faktuur.workspace_id,
        vouer: "Fakture",
        naam: `${data.nommer}.pdf`,
        bucket: "invoice-pdfs",
        path: pad,
      });
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.FAKTUUR_FROM ?? "AP HQ <fakture@aitsa.tech>";
  // Gemini writes the Afrikaans note (house rule); template is the fallback.
  const geskryf = await skryfAfrikaans(
    `Skryf 'n kort, professionele, vriendelike Afrikaanse e-posnota (3-4 sinne, geen onderwerpreël nie) wat 'n aangehegte faktuur ${data.nommer} van ${data.workspace.naam} aan kliënt ${data.client.naam} stuur. Onderteken as André-Pierre du Plessis. Geen plekhouers nie.`
  );
  const teks =
    geskryf ??
    `Goeie dag ${data.client.naam},\n\nAangeheg: faktuur ${data.nommer} van ${data.workspace.naam}.\n\nGroete\nAndré-Pierre du Plessis`;
  const { error } = await resend.emails.send({
    from,
    to: data.client.epos,
    subject: `Faktuur ${data.nommer} — ${data.workspace.naam}`,
    text: teks,
    attachments: [{ filename: `${data.nommer}.pdf`, content: pdf }],
  });
  if (error) return { fout: `Resend: ${error.message}` };

  await svc.from("invoices").update({ status: "gestuur", pdf_path: pad }).eq("id", invoiceId);
  return { ok: true };
}
