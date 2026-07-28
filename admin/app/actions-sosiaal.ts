"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { skryfAfrikaans } from "@/lib/gemini";

export type SosialeTekste = { x: string; instagram: string; linkedin: string; whatsapp: string };

export type KaartStukInvoer = { kop: string; opsomming: string };

/** Parseer die geplakte (finale) nuusbrief in poskaart-stukke: voorblad +
 *  stories, elk met 'n kort opsomming — nooit die "Oor die volgende
 *  X minute"-teaser of foto-byskrifte nie. */
export async function laaiNuusbriefOp(teks: string): Promise<number> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !teks.trim()) return 0;

  const antwoord = await skryfAfrikaans(
    `Hier is vandag se gepubliseerde Buitelyn-nuusbrief. Onttrek poskaart-stukke daaruit as SUIWER JSON: 'n lys van 4-6 objekte {"kop": "...", "opsomming": "..."}.

Reëls:
- Die EERSTE stuk is die voorblad: "kop" = die nuusbrief se titel (sonder emoji's), "opsomming" = EEN kort sin wat die dag se kern opsom. NOOIT die "Oor die volgende X minute en Y sekondes"-reël nie.
- Daarna een stuk per storie: "kop" = die storie-opskrif, "opsomming" = een kort feitelike sin (maks 18 woorde) wat die storie opsom. NOOIT die kursiewe foto-byskrifte/grappies onder die opskrifte gebruik nie — skryf 'n eie opsomming uit die storie-inhoud.
- Geen emoji's, geen markdown, geen skakels in koppe of opsommings nie.

Nuusbrief:
${teks.slice(0, 12_000)}`
  );
  try {
    const skoon = (antwoord ?? "").replace(/^```json?\n?|```$/g, "").trim();
    const lys = JSON.parse(skoon);
    if (!Array.isArray(lys) || !lys.length) return 0;
    const stukke: KaartStukInvoer[] = lys
      .slice(0, 6)
      .map((i) => ({ kop: String(i?.kop ?? "").trim(), opsomming: String(i?.opsomming ?? "").trim() }))
      .filter((i) => i.kop);
    const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
      new Date()
    );
    await sb
      .from("sosiaal_stukke")
      .upsert({ datum, stukke }, { onConflict: "datum" });
    return stukke.length;
  } catch {
    return 0;
  }
}

/** Platform-spesifieke plasings uit vandag se konsep, in die Buitelyn-stem. */
export async function krySosialeTekste(): Promise<SosialeTekste | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const datum = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date()
  );
  const { data: konsep } = await sb
    .from("nuusbrief_konsepte")
    .select("teks")
    .eq("datum", datum)
    .maybeSingle();
  if (!konsep?.teks) return null;

  const antwoord = await skryfAfrikaans(
    `Hier is vandag se Buitelyn-nuusbrief. Skryf 4 sosiale-media-plasings daaruit, elk in Buitelyn se stem (helder, speels-ernstig, Afrikaans):

1. "x": 'n X/Twitter-plasing (maks 260 karakters) — die sappigste storie as skeut, eindig met buitelyn.com/markte. Geen hutsmerke nie.
2. "instagram": 'n Instagram-onderskrif (±80 woorde) — effens warmer, 2-3 relevante Afrikaanse hutsmerke aan die einde, verwys na "skakel in bio".
3. "linkedin": 'n LinkedIn-plasing (±100 woorde) — dieselfde storie sakelik-toeganklik verpak, geen hutsmerke nie, eindig met buitelyn.com/markte.
4. "whatsapp": 'n WhatsApp-kanaal-boodskap (maks 5 reëls) — begin met een emoji, die dag se 3 kernpunte in kort reëls, sluit met die skakel.

Reëls: net feite uit die nuusbrief; geen versinsels nie; syfers presies soos in die teks. Antwoord as SUIWER JSON: {"x": "...", "instagram": "...", "linkedin": "...", "whatsapp": "..."}.

Nuusbrief:
${konsep.teks.slice(0, 6000)}`
  );
  try {
    const skoon = (antwoord ?? "").replace(/^```json?\n?|```$/g, "").trim();
    const d = JSON.parse(skoon);
    return {
      x: String(d.x ?? ""),
      instagram: String(d.instagram ?? ""),
      linkedin: String(d.linkedin ?? ""),
      whatsapp: String(d.whatsapp ?? ""),
    };
  } catch {
    return null;
  }
}
