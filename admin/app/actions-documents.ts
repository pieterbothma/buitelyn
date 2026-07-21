"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function laaiDokumentOp(workspaceId: string, vouer: string, vorm: FormData) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  const lêer = vorm.get("lêer") as File | null;
  if (!lêer || lêer.size === 0) return;
  const svc = supabaseService();
  const path = `${workspaceId}/${vouer}/${Date.now()}-${lêer.name.replace(/[^\w.\-]/g, "_")}`;
  const { error } = await svc.storage
    .from("dokumente")
    .upload(path, Buffer.from(await lêer.arrayBuffer()), {
      contentType: lêer.type || "application/octet-stream",
    });
  if (!error) {
    await sb.from("documents").insert({
      workspace_id: workspaceId,
      vouer,
      naam: lêer.name,
      bucket: "dokumente",
      path,
    });
  }
  revalidatePath("/", "layout");
}

export async function skrapDokument(id: string) {
  const sb = await supabaseServer();
  const { data: dok } = await sb.from("documents").select("bucket, path").eq("id", id).single();
  if (dok) {
    const svc = supabaseService();
    await svc.storage.from(dok.bucket).remove([dok.path]);
  }
  await sb.from("documents").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function dokumentSkakel(bucket: string, path: string): Promise<string | null> {
  const svc = supabaseService();
  const { data } = await svc.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
