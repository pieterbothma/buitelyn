"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

const CARD_VOLGORDE = ["beplan", "produksie", "gereed", "gepubliseer"] as const;

export async function skuifKaart(id: string, rigting: "vorentoe" | "terug") {
  const sb = await supabaseServer();
  const { data: kaart } = await sb.from("cards").select("status").eq("id", id).single();
  if (!kaart) return;
  const i = CARD_VOLGORDE.indexOf(kaart.status as (typeof CARD_VOLGORDE)[number]);
  const nuut =
    rigting === "vorentoe"
      ? CARD_VOLGORDE[Math.min(i + 1, CARD_VOLGORDE.length - 1)]
      : CARD_VOLGORDE[Math.max(i - 1, 0)];
  await sb.from("cards").update({ status: nuut }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function stoorIdee(vorm: FormData) {
  const sb = await supabaseServer();
  const workspace_id = (vorm.get("workspace_id") as string) || null;
  const format_id = (vorm.get("format_id") as string) || null;
  await sb.from("ideas").insert({
    titel: String(vorm.get("titel") ?? "").trim(),
    nota: String(vorm.get("nota") ?? "").trim() || null,
    skakel: String(vorm.get("skakel") ?? "").trim() || null,
    workspace_id: workspace_id || null,
    format_id: format_id || null,
    bron: "in_app",
  });
  revalidatePath("/", "layout");
}

export async function tagIdee(id: string, workspaceId: string) {
  const sb = await supabaseServer();
  await sb.from("ideas").update({ workspace_id: workspaceId }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function skrapIdee(id: string) {
  const sb = await supabaseServer();
  await sb.from("ideas").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function promoveerIdee(id: string, dueAt: string) {
  const sb = await supabaseServer();
  const { data: idee } = await sb.from("ideas").select("*").eq("id", id).single();
  if (!idee?.workspace_id) return; // Inkassie-idees moet eers getag word
  await sb.from("cards").insert({
    workspace_id: idee.workspace_id,
    format_id: idee.format_id,
    titel: idee.titel,
    due_at: new Date(dueAt).toISOString(),
    idea_id: idee.id,
    status: "beplan",
  });
  revalidatePath("/", "layout");
}
