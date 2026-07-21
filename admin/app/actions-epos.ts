"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ontkoppelAccount, stuurEpos } from "@/lib/unipile";

async function eieAccountId(): Promise<string | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("email_accounts")
    .select("account_id")
    .order("geskep_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.account_id ?? null;
}

export async function ontkoppelEpos() {
  const sb = await supabaseServer();
  const accountId = await eieAccountId();
  if (!accountId) return;
  await ontkoppelAccount(accountId).catch(() => {});
  await sb.from("email_accounts").delete().eq("account_id", accountId);
  revalidatePath("/epos");
  redirect("/epos");
}

export async function antwoordEpos(vorm: FormData) {
  const accountId = await eieAccountId();
  if (!accountId) return;
  const na = String(vorm.get("na") ?? "").trim();
  const onderwerp = String(vorm.get("onderwerp") ?? "").trim();
  const teks = String(vorm.get("teks") ?? "").trim();
  const replyTo = String(vorm.get("reply_to") ?? "") || null;
  const terug = String(vorm.get("terug") ?? "/epos");
  if (!na || !teks) return;
  await stuurEpos(accountId, { na, onderwerp, teks, replyTo });
  redirect(`${terug}?gestuur=1`);
}
