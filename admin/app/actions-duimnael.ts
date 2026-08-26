"use server";

import { supabaseServer } from "@/lib/supabase/server";

const EMMER = "duimnael-reaksies";

export type Reaksie = { naam: string; url: string };

/** Die reaksie-biblioteek is 'n emmer-lys, nie 'n vasgedraade register nie —
 *  AP laai skote op en vee hulle uit sonder 'n ontplooiing. */
export async function lysReaksies(): Promise<Reaksie[]> {
  const sb = await supabaseServer();
  const { data } = await sb.storage.from(EMMER).list("", { limit: 200, sortBy: { column: "name", order: "asc" } });
  const basis = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EMMER}`;
  return (data ?? [])
    .filter((f) => f.name.toLowerCase().endsWith(".png"))
    .map((f) => ({ naam: f.name, url: `${basis}/${f.name}` }));
}
