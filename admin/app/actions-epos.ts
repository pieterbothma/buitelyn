"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ontkoppelAccount, stuurEpos } from "@/lib/unipile";

/** Verify the given account belongs to this (allowlisted) user's table. */
async function geldigeAccount(accountId: string): Promise<boolean> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb
    .from("email_accounts")
    .select("account_id")
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(data);
}

export async function ontkoppelEpos(accountId: string) {
  if (!(await geldigeAccount(accountId))) return;
  const sb = await supabaseServer();
  await ontkoppelAccount(accountId).catch(() => {});
  await sb.from("email_accounts").delete().eq("account_id", accountId);
  revalidatePath("/epos");
  redirect("/epos");
}

export async function antwoordEpos(vorm: FormData) {
  const accountId = String(vorm.get("account_id") ?? "");
  if (!accountId || !(await geldigeAccount(accountId))) return;
  const na = String(vorm.get("na") ?? "").trim();
  const onderwerp = String(vorm.get("onderwerp") ?? "").trim();
  const teks = String(vorm.get("teks") ?? "").trim();
  const replyTo = String(vorm.get("reply_to") ?? "") || null;
  const terug = String(vorm.get("terug") ?? "/epos");
  if (!na || !teks) return;
  await stuurEpos(accountId, { na, onderwerp, teks, replyTo });
  redirect(`${terug}${terug.includes("?") ? "&" : "?"}gestuur=1`);
}
