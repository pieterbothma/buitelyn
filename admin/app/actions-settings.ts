"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function stoorInstellings(workspaceId: string, vorm: FormData) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  let logo_path: string | undefined;
  const logo = vorm.get("logo") as File | null;
  if (logo && logo.size > 0) {
    const svc = supabaseService();
    const ext = (logo.name.split(".").pop() || "png").toLowerCase();
    logo_path = `${workspaceId}.${ext}`;
    await svc.storage.from("logos").upload(logo_path, Buffer.from(await logo.arrayBuffer()), {
      contentType: logo.type || "image/png",
      upsert: true,
    });
  }

  await sb.from("entity_settings").upsert({
    workspace_id: workspaceId,
    maatskappy: String(vorm.get("maatskappy") ?? "").trim() || null,
    reg_nr: String(vorm.get("reg_nr") ?? "").trim() || null,
    btw_nr: String(vorm.get("btw_nr") ?? "").trim() || null,
    adres: String(vorm.get("adres") ?? "").trim() || null,
    terme: String(vorm.get("terme") ?? "").trim() || null,
    bank_besonderhede: String(vorm.get("bank_besonderhede") ?? "").trim() || null,
    faktuur_epos_from: String(vorm.get("faktuur_epos_from") ?? "").trim() || null,
    ...(logo_path ? { logo_path } : {}),
  });
  revalidatePath("/", "layout");
}

export async function skepKaart(workspaceId: string, vorm: FormData) {
  const sb = await supabaseServer();
  const titel = String(vorm.get("titel") ?? "").trim();
  const wanneer = String(vorm.get("wanneer") ?? "");
  if (!titel || !wanneer) return;
  // datetime-local is naive; AP werk in SAST (UTC+2, geen DST)
  const due = new Date(`${wanneer}:00+02:00`);
  const format_id = (vorm.get("format_id") as string) || null;
  await sb.from("cards").insert({
    workspace_id: workspaceId,
    format_id,
    titel,
    due_at: due.toISOString(),
    status: "beplan",
  });
  revalidatePath("/", "layout");
}
