"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { winkelKlient } from "@/lib/winkel";
import { toegelaat } from "@/lib/toegang";

export async function merkGestuur(id: string): Promise<void> {
  /* Aksie-hek: die middleware beskerm blaaie, maar 'n server action is 'n
     POST-eindpunt — kontroleer die sessie self. */
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Nie aangemeld nie");
  if (!toegelaat(user.email)) throw new Error("Nie toegelaat nie");
  await winkelKlient()
    .from("winkel_bestellings")
    .update({ status: "gestuur" })
    .eq("id", id)
    .eq("status", "betaal");
  revalidatePath("/bestellings");
}
