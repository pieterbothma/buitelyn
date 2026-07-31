"use server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabase/service";

/* Die syfer wat Piet vir EasyEquities wys. Dis reeds bot-gefilterde en
   ontdubbelde data — die telling hier is 'n eenvoudige som, sodat die metode
   in een sin verduidelik kan word.

   BELANGRIK: PostgREST se verstek `max_rows` is 1000. Twee maande se rou rye
   in een `select()` sonder perke kan dus stilweg afgekap word — en omdat die
   navraag `geskep_at desc` orden, is dit die OUER maand (`vorigeTotaal`) wat
   eerste verdwyn, presies wanneer die verkeer hoog genoeg is om oor te
   onderhandel. `totaal` en `vorigeTotaal` word daarom met eksakte
   `count: "exact", head: true`-navrae bereken (Postgres tel dan self, sonder
   om rye oor die draad te stuur), nooit deur opgehaalde rye te tel nie. Die
   per-gids/per-plek-opsomming en die CSV benodig wel die rou rye vir hierdie
   maand — dié word omsigtig geblaai (`range()`) sodat 'n groot maand ook nie
   afgekap word nie. */

export type SponsorVerslag = {
  maand: string;
  totaal: number;
  vorigeTotaal: number;
  perGids: { gids: string; klikke: number }[];
  perPlek: { plek: string; klikke: number }[];
  rou: { gids: string; plek: string; geskep_at: string }[];
  /** 'n Navraag het misluk (bv. tabel nog nie geskep nie) — die syfers hierbo
   *  is dan nie te vertrou nie en die bladsy moet dit eerlik erken. */
  fout: boolean;
  /** Eksakte alle-tyd-telling, ongeag maand — dra die "niks al ooit gelog
   *  nie"-waarskuwing in die bladsy (sien fout-teenoor-leeg-onderskeid daar). */
  alleTydTotaal: number;
};

const TABEL = "sponsor_klikke";

async function telInVenster(
  sb: SupabaseClient,
  van?: Date,
  tot?: Date
): Promise<{ count: number; fout: boolean }> {
  let q = sb.from(TABEL).select("*", { count: "exact", head: true });
  if (van) q = q.gte("geskep_at", van.toISOString());
  if (tot) q = q.lt("geskep_at", tot.toISOString());
  const { count, error } = await q;
  return { count: count ?? 0, fout: Boolean(error) };
}

// PostgREST kap enige enkele select() by max_rows (verstek 1000) — ons blaai
// dus eksplisiet in bladsye van 1000 tot alles opgehaal is, in plaas daarvan
// om op 'n enkele onbeperkte navraag staat te maak.
const BLAD_GROOTTE = 1000;

async function kryRyeVirVenster(
  sb: SupabaseClient,
  van: Date
): Promise<{ rye: { gids: string; plek: string; geskep_at: string }[]; fout: boolean }> {
  const rye: { gids: string; plek: string; geskep_at: string }[] = [];
  let vanaf = 0;
  for (;;) {
    const { data, error } = await sb
      .from(TABEL)
      .select("gids, plek, geskep_at")
      .gte("geskep_at", van.toISOString())
      .order("geskep_at", { ascending: false })
      .range(vanaf, vanaf + BLAD_GROOTTE - 1);
    if (error) return { rye, fout: true };
    const bladsy = (data ?? []) as { gids: string; plek: string; geskep_at: string }[];
    rye.push(...bladsy);
    if (bladsy.length < BLAD_GROOTTE) break;
    vanaf += BLAD_GROOTTE;
  }
  return { rye, fout: false };
}

export async function krySponsorKlikke(): Promise<SponsorVerslag> {
  const nou = new Date();
  const begin = new Date(Date.UTC(nou.getUTCFullYear(), nou.getUTCMonth(), 1));
  const vorigeBegin = new Date(Date.UTC(nou.getUTCFullYear(), nou.getUTCMonth() - 1, 1));

  const sb = supabaseService();

  const [totaalRes, vorigeRes, alleTydRes, ryeRes] = await Promise.all([
    telInVenster(sb, begin),
    telInVenster(sb, vorigeBegin, begin),
    telInVenster(sb),
    kryRyeVirVenster(sb, begin),
  ]);

  const tel = <K extends string>(lys: { [k in K]: string }[], sleutel: K) => {
    const m = new Map<string, number>();
    for (const r of lys) m.set(r[sleutel], (m.get(r[sleutel]) ?? 0) + 1);
    return [...m.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  };

  return {
    maand: new Intl.DateTimeFormat("af-ZA", { month: "long", year: "numeric" }).format(nou),
    totaal: totaalRes.count,
    vorigeTotaal: vorigeRes.count,
    perGids: tel(ryeRes.rye, "gids").map(({ k, v }) => ({ gids: k, klikke: v })),
    perPlek: tel(ryeRes.rye, "plek").map(({ k, v }) => ({ plek: k, klikke: v })),
    rou: ryeRes.rye,
    fout: totaalRes.fout || vorigeRes.fout || alleTydRes.fout || ryeRes.fout,
    alleTydTotaal: alleTydRes.count,
  };
}
