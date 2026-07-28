"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { skryfAfrikaans } from "@/lib/gemini";

export type SosialeTekste = { x: string; instagram: string; linkedin: string; whatsapp: string };

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
