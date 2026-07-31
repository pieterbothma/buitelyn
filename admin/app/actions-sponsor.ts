"use server";
import { supabaseService } from "@/lib/supabase/service";

/* Die syfer wat Piet vir EasyEquities wys. Dis reeds bot-gefilterde en
   ontdubbelde data — die telling hier is 'n eenvoudige som, sodat die metode
   in een sin verduidelik kan word. */

export type SponsorVerslag = {
  maand: string;
  totaal: number;
  vorigeTotaal: number;
  perGids: { gids: string; klikke: number }[];
  perPlek: { plek: string; klikke: number }[];
  rou: { gids: string; plek: string; geskep_at: string }[];
};

export async function krySponsorKlikke(): Promise<SponsorVerslag> {
  const nou = new Date();
  const begin = new Date(Date.UTC(nou.getUTCFullYear(), nou.getUTCMonth(), 1));
  const vorigeBegin = new Date(Date.UTC(nou.getUTCFullYear(), nou.getUTCMonth() - 1, 1));

  const sb = supabaseService();
  // Let op: as die tabel nog nie geskep is nie (migrasie nog nie toegepas nie),
  // gee Supabase 'n fout terug en bly `data` null — ons val dan terug op 'n leë
  // lys sodat die bladsy steeds skoon met nulle vertoon, nooit crash nie.
  const { data } = await sb
    .from("sponsor_klikke")
    .select("gids, plek, geskep_at")
    .gte("geskep_at", vorigeBegin.toISOString())
    .order("geskep_at", { ascending: false });

  const rye = (data ?? []) as { gids: string; plek: string; geskep_at: string }[];
  const hierdieMaand = rye.filter((r) => new Date(r.geskep_at) >= begin);
  const vorige = rye.filter((r) => new Date(r.geskep_at) < begin);

  const tel = <K extends string>(lys: { [k in K]: string }[], sleutel: K) => {
    const m = new Map<string, number>();
    for (const r of lys) m.set(r[sleutel], (m.get(r[sleutel]) ?? 0) + 1);
    return [...m.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  };

  return {
    maand: new Intl.DateTimeFormat("af-ZA", { month: "long", year: "numeric" }).format(nou),
    totaal: hierdieMaand.length,
    vorigeTotaal: vorige.length,
    perGids: tel(hierdieMaand, "gids").map(({ k, v }) => ({ gids: k, klikke: v })),
    perPlek: tel(hierdieMaand, "plek").map(({ k, v }) => ({ plek: k, klikke: v })),
    rou: hierdieMaand,
  };
}
