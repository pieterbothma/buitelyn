"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { winkelKlient } from "@/lib/winkel";
import { toegelaat } from "@/lib/toegang";
import { stuurSpoorEpos } from "@/lib/epos";
import type { Bestelling } from "@/lib/winkel";

async function hek(): Promise<void> {
  /* Aksie-hek: die middleware beskerm blaaie, maar 'n server action is 'n
     POST-eindpunt — kontroleer die sessie self. */
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Nie aangemeld nie");
  if (!toegelaat(user.email)) throw new Error("Nie toegelaat nie");
}

/* Merk as gestuur, met 'n opsionele koerier en spoornommer — 'n handaflewering
   het nie 'n spoornommer nie. Die koper kry dadelik die op-pad-e-pos. */
export async function merkGestuur(id: string, f?: FormData): Promise<void> {
  await hek();
  const koerier = (f?.get("koerier") ?? "").toString().trim().slice(0, 60) || null;
  const spoornommer = (f?.get("spoornommer") ?? "").toString().trim().slice(0, 60) || null;

  const { data: ry } = await winkelKlient()
    .from("winkel_bestellings")
    .update({ status: "gestuur", koerier, spoornommer })
    .eq("id", id)
    .eq("status", "betaal")
    .select()
    .single();
  /* Geen ry = reeds gestuur of nie betaal nie — stil klaar, geen dubbele e-pos. */
  if (ry) await stuurSpoorEpos(ry as Bestelling, koerier, spoornommer);
  revalidatePath("/bestellings");
}

/* Spoorbesonderhede NÁ die gestuur-merk — die koerier gee dikwels eers later
   'n spoornommer. Werk net op 'n gestuur-bestelling en stuur (of herstuur)
   die op-pad-e-pos met wat ingevul is. */
export async function stoorSpoor(id: string, f: FormData): Promise<void> {
  await hek();
  const koerier = (f.get("koerier") ?? "").toString().trim().slice(0, 60) || null;
  const spoornommer = (f.get("spoornommer") ?? "").toString().trim().slice(0, 60) || null;
  const { data: ry } = await winkelKlient()
    .from("winkel_bestellings")
    .update({ koerier, spoornommer })
    .eq("id", id)
    .eq("status", "gestuur")
    .select()
    .single();
  if (ry) await stuurSpoorEpos(ry as Bestelling, koerier, spoornommer);
  revalidatePath("/bestellings");
}
