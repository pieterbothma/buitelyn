"use server";
import { supabaseService } from "@/lib/supabase/service";
import { groepeerLeers, type Dag } from "@/lib/oorsig-argief";

/* Lees die bucket, nie markte_oorsigte nie: die tabel hou één oudio_url per dag
   en sou dus een speler per dag wys in plaas van drie. */
export async function kryOorsigArgief(): Promise<{ dae: Dag[]; fout: string | null }> {
  const basis = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!basis) return { dae: [], fout: "NEXT_PUBLIC_SUPABASE_URL is nie gestel nie." };

  const { data, error } = await supabaseService()
    .storage.from("markte-oudio")
    /* sortBy is nie kosmeties nie: teen 3 lêers per beursdag tref die
       1000-perk oor ±15 maande, en sonder 'n eksplisiete sortering kon die
       afgekapte bladsy eendag juis die nuutste dae uitlaat. ISO-datums
       sorteer leksikografies, dus gee name desc altyd nuutste eerste. */
    .list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });

  if (error) return { dae: [], fout: error.message };

  const leers = (data ?? []).map((f) => ({
    name: f.name,
    grootte: (f.metadata as { size?: number } | null)?.size ?? 0,
  }));
  return { dae: groepeerLeers(leers, basis), fout: null };
}
