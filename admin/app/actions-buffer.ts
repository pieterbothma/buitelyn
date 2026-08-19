"use server";

import {
  bufferConfigured,
  keurPlasing,
  kryKanale,
  kryRekening,
  skepPlasings,
  skrapPlasing,
  type Kanaal,
  type Uitslag,
} from "@/lib/buffer";
import { supabaseServer } from "@/lib/supabase/server";

async function aangemeld(): Promise<boolean> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return Boolean(user);
}

export type KanaalLys = {
  ok: boolean;
  fout?: string;
  /** Wys "6/8 kanale" sodat 'n vol plan sigbaar is voordat 'n plasing misluk. */
  opsomming?: string;
  kanale: Kanaal[];
};

/** Haal die kanale. Die organisasie kom uit die rekening self, so daar is geen
 *  BUFFER_ORG_ID-veranderlike om verkeerd te stel nie. */
export async function kryBufferKanale(): Promise<KanaalLys> {
  if (!(await aangemeld())) return { ok: false, fout: "Nie aangemeld nie.", kanale: [] };
  if (!bufferConfigured())
    return { ok: false, fout: "BUFFER_API_KEY is nie gestel nie.", kanale: [] };

  try {
    const rekening = await kryRekening();
    const org = rekening.organisasies[0];
    if (!org) return { ok: false, fout: "Geen Buffer-organisasie gevind nie.", kanale: [] };
    const kanale = await kryKanale(org.id);
    return {
      ok: true,
      opsomming: `${rekening.epos} · ${org.kanale}/${org.kanaalLimiet} kanale`,
      kanale,
    };
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : "Buffer-fout", kanale: [] };
  }
}

export type SkeduleerInvoer = {
  kanale: Kanaal[];
  teks: string;
  beeldUrl?: string | null;
  ekstraBeelde?: string[];
  altTeks?: string;
  /** SAST "2026-08-14T17:00"; leeg = die kanaal se volgende tou-gleuf. */
  wanneer?: string | null;
  konsep: boolean;
  eersteKommentaar?: string;
};

/** Keur alles vooraf, sonder om Buffer te bel — sodat die knoppie kan wys wat
 *  gaan misluk voordat 'n onomkeerbare plasing geskep word. */
export async function keurVooraf(invoer: SkeduleerInvoer): Promise<{ kanaal: string; fout: string }[]> {
  if (!(await aangemeld())) return [{ kanaal: "—", fout: "Nie aangemeld nie." }];
  return invoer.kanale
    .map((kanaal) => ({ kanaal: kanaal.naam, fout: keurPlasing({ ...invoer, kanaal }) }))
    .filter((r): r is { kanaal: string; fout: string } => Boolean(r.fout));
}

export async function skeduleer(invoer: SkeduleerInvoer): Promise<Uitslag[]> {
  if (!(await aangemeld())) return [];
  if (!invoer.kanale.length) return [];
  return skepPlasings(
    invoer.kanale.map((kanaal) => ({
      kanaal,
      teks: invoer.teks,
      beeldUrl: invoer.beeldUrl,
      ekstraBeelde: invoer.ekstraBeelde,
      altTeks: invoer.altTeks,
      wanneer: invoer.wanneer || null,
      konsep: invoer.konsep,
      eersteKommentaar: invoer.eersteKommentaar,
    }))
  );
}

/** Ongedaan-knoppie. posts delete is effektief idempotent: 'n tweede oproep sê
 *  net "not found". */
export async function skrapBufferPlasing(plasingId: string): Promise<{ ok: boolean; fout?: string }> {
  if (!(await aangemeld())) return { ok: false, fout: "Nie aangemeld nie." };
  try {
    await skrapPlasing(plasingId);
    return { ok: true };
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : "Kon nie skrap nie." };
  }
}
