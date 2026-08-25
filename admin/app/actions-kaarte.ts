"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { normaliseerKaart, type Kaart } from "@/lib/kaart/spec";

/** Lys die dag se beelde uit die publieke konsep-fotos-bucket — dieselfde bron
 *  as die galery op die konsep-blad, sodat 'n Foto-Idee of spotprent sonder
 *  omweg op 'n kaart beland.
 *
 *  LET WEL: Klipy-media kom NIE hier in nie. Hul voorwaardes verbied "store,
 *  mirror, re-host, or retain copies" — en 'n gebakte kaart-PNG bevat 'n kopie
 *  van die beeld. Klipy bly dus 'n blaai-oppervlak in die nuusbrief, nie 'n
 *  bron vir kaarte nie. */
export async function lysGaleryFotos(datum: string): Promise<string[]> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return [];

  const { data } = await sb.storage.from("konsep-fotos").list(datum, { limit: 60 });
  return (data ?? [])
    .filter((f) => /\.(png|jpe?g)$/i.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name))
    .map(
      (f) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/konsep-fotos/${datum}/${f.name}`
    );
}

/* ── Gestoorde kaarte ────────────────────────────────────────────────── */

export type KaartRy = {
  id: string;
  datum: string;
  titel: string | null;
  styl: string;
  vorm: string;
  spek: unknown;
  png_url: string | null;
  opgedateer_at: string;
};

async function aangemeld(): Promise<boolean> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return Boolean(user);
}

/** Die laaste kaarte, nuutste eerste. */
export async function lysKaarte(dae = 14): Promise<KaartRy[]> {
  const sb = await supabaseServer();
  if (!(await aangemeld())) return [];
  const vanaf = new Date(Date.now() - dae * 86_400_000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("sosiaal_kaarte")
    .select("id, datum, titel, styl, vorm, spek, png_url, opgedateer_at")
    .gte("datum", vanaf)
    .order("datum", { ascending: false })
    .order("geskep_at", { ascending: false })
    .limit(60);
  return (data ?? []) as KaartRy[];
}

/** Skep of dateer 'n kaart op.
 *
 *  Die RENDER gebeur in /api/sosiaal/kaart?stoor — hierdie aksie doen net die
 *  DB-skryf. Kleiner ontploffingsradius, en dit hergebruik presies die
 *  eindpunt wat die voorskou reeds elke paar sekondes uitoefen. */
export async function stoorKaart(invoer: {
  id?: string;
  datum: string;
  titel?: string;
  kaart: Kaart;
  pngUrl?: string | null;
}): Promise<{ ok: boolean; id?: string; fout?: string }> {
  const sb = await supabaseServer();
  if (!(await aangemeld())) return { ok: false, fout: "Nie aangemeld nie." };

  const kaart = normaliseerKaart(invoer.kaart);
  const ry = {
    datum: invoer.datum,
    titel: invoer.titel?.trim() || null,
    styl: kaart.spec.styl,
    vorm: kaart.vorm,
    spek: kaart as unknown as Record<string, unknown>,
    png_url: invoer.pngUrl ?? null,
    opgedateer_at: new Date().toISOString(),
  };

  const { data, error } = invoer.id
    ? await sb.from("sosiaal_kaarte").update(ry).eq("id", invoer.id).select("id").maybeSingle()
    : await sb.from("sosiaal_kaarte").insert(ry).select("id").maybeSingle();

  if (error) return { ok: false, fout: error.message };
  revalidatePath("/w/buitelyn/kaarte");
  return { ok: true, id: data?.id };
}

export async function dupliseerKaart(id: string): Promise<{ ok: boolean; fout?: string }> {
  const sb = await supabaseServer();
  if (!(await aangemeld())) return { ok: false, fout: "Nie aangemeld nie." };
  const { data } = await sb
    .from("sosiaal_kaarte")
    .select("datum, titel, styl, vorm, spek")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, fout: "Kaart nie gevind nie." };
  // png_url word NIE gekopieer nie — die duplikaat moet self gebak word.
  const { error } = await sb
    .from("sosiaal_kaarte")
    .insert({ ...data, titel: data.titel ? `${data.titel} (kopie)` : null });
  if (error) return { ok: false, fout: error.message };
  revalidatePath("/w/buitelyn/kaarte");
  return { ok: true };
}

export async function skrapKaart(id: string): Promise<{ ok: boolean; fout?: string }> {
  const sb = await supabaseServer();
  if (!(await aangemeld())) return { ok: false, fout: "Nie aangemeld nie." };
  const { error } = await sb.from("sosiaal_kaarte").delete().eq("id", id);
  if (error) return { ok: false, fout: error.message };
  revalidatePath("/w/buitelyn/kaarte");
  return { ok: true };
}
