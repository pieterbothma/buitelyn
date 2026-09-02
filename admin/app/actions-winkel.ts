"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { winkelKlient } from "@/lib/winkel";
import { toegelaat } from "@/lib/toegang";
/* Die e-pos-ontwerp leef by die winkel self (web/lib/winkel/epos.ts) — een
   bron vir al drie e-posse. Turbopack hanteer die kruis-app-import; as dit
   ooit breek, is die terugval 'n plaaslike kopie soos rand(). */
import { stuurSpoorEpos, type BestellingRy } from "../../web/lib/winkel/epos";

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
  if (ry) await stuurSpoorEpos(ry as BestellingRy, koerier, spoornommer);
  revalidatePath("/bestellings");
}
