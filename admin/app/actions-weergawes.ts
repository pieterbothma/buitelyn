"use server";

import { supabaseServer } from "@/lib/supabase/server";

function vandagSAST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
}

/** Outostoor: skryf die hoofteks (oorsig/konsep) én los 'n weergawe-snapshot
 *  as die teks werklik verander het. Word elke ±20s deur die redigeerders
 *  geroep — niks gaan ooit weer verlore deur weg te navigeer nie. */
export async function outoStoor(tipe: "oorsig" | "konsep" | "oudio", teks: string, datum?: string): Promise<string | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !teks.trim()) return null;
  const doelDatum = datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : vandagSAST();

  // hoofteks
  if (tipe === "oorsig") {
    await sb.from("studio_oorsigte").upsert(
      { datum: doelDatum, teks, opgedateer_at: new Date().toISOString() },
      { onConflict: "datum" }
    );
  } else if (tipe === "oudio") {
    /* UPDATE, nie upsert nie: studio_oorsigte.teks is NOT NULL, dus sou 'n
       invoeging met net oudio_teks val. Die ry bestaan in elk geval altyd
       teen die tyd dat daar 'n oudio-skrip is — die oorsig se eie outostoor
       skep hom binne 20s. */
    await sb
      .from("studio_oorsigte")
      .update({ oudio_teks: teks, opgedateer_at: new Date().toISOString() })
      .eq("datum", doelDatum);
  } else {
    await sb.from("nuusbrief_konsepte").upsert(
      { datum: doelDatum, teks, opgedateer_at: new Date().toISOString() },
      { onConflict: "datum" }
    );
  }

  // weergawe net as dit verskil van die jongste snapshot
  const { data: jongste } = await sb
    .from("studio_weergawes")
    .select("teks")
    .eq("tipe", tipe)
    .eq("datum", doelDatum)
    .order("geskep_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (jongste?.teks !== teks) {
    await sb.from("studio_weergawes").insert({ tipe, datum: doelDatum, teks });
    // hou net die jongste 25 per dag
    const { data: almal } = await sb
      .from("studio_weergawes")
      .select("id")
      .eq("tipe", tipe)
      .eq("datum", doelDatum)
      .order("geskep_at", { ascending: false });
    if (almal && almal.length > 25) {
      await sb
        .from("studio_weergawes")
        .delete()
        .in("id", almal.slice(25).map((r) => r.id));
    }
  }
  return new Date().toISOString();
}

export type Weergawe = { id: string; teks: string; geskep_at: string };

export async function kryWeergawes(tipe: "oorsig" | "konsep" | "oudio", datum?: string): Promise<Weergawe[]> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const doelDatum = datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : vandagSAST();
  const { data } = await sb
    .from("studio_weergawes")
    .select("id, teks, geskep_at")
    .eq("tipe", tipe)
    .eq("datum", doelDatum)
    .order("geskep_at", { ascending: false })
    .limit(25);
  return (data ?? []) as Weergawe[];
}
