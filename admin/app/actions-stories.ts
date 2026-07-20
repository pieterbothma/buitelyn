"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function skepStorie(workspaceId: string, vorm: FormData) {
  const sb = await supabaseServer();
  const { data: storie } = await sb
    .from("stories")
    .insert({
      workspace_id: workspaceId,
      titel: String(vorm.get("titel") ?? "").trim(),
      bron_naam: String(vorm.get("bron_naam") ?? "").trim() || null,
      bron_kontak: String(vorm.get("bron_kontak") ?? "").trim() || null,
      notas: String(vorm.get("notas") ?? "").trim() || null,
    })
    .select("id")
    .single();

  const lêer = vorm.get("lêer") as File | null;
  if (storie && lêer && lêer.size > 0) {
    await laaiStorieLêerOp(storie.id, lêer);
  }
  revalidatePath("/", "layout");
}

async function laaiStorieLêerOp(storieId: string, lêer: File) {
  const svc = supabaseService();
  const pad = `${storieId}/${Date.now()}-${lêer.name.replace(/[^\w.\-]/g, "_")}`;
  const buffer = Buffer.from(await lêer.arrayBuffer());
  const { error } = await svc.storage.from("stories").upload(pad, buffer, {
    contentType: lêer.type || "application/octet-stream",
  });
  if (!error) {
    await svc.from("story_files").insert({ story_id: storieId, path: pad, naam: lêer.name });
  }
}

export async function voegLêerBy(storieId: string, vorm: FormData) {
  const lêer = vorm.get("lêer") as File | null;
  if (lêer && lêer.size > 0) await laaiStorieLêerOp(storieId, lêer);
  revalidatePath("/", "layout");
}

export async function stelStorieStatus(id: string, status: string) {
  const sb = await supabaseServer();
  await sb.from("stories").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function lêerSkakel(pad: string): Promise<string | null> {
  const svc = supabaseService();
  const { data } = await svc.storage.from("stories").createSignedUrl(pad, 3600);
  return data?.signedUrl ?? null;
}
