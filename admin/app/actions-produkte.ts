"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { winkelKlient, GROOTTES } from "@/lib/winkel";
import { toegelaat } from "@/lib/toegang";

/* Aksie-hek: die middleware beskerm blaaie, maar 'n server action is 'n
   POST-eindpunt — kontroleer die sessie self. Herbruik oor al hierdie
   aksies i.p.v. dit tien keer te herhaal (soos actions-winkel.ts se
   merkGestuur, maar met een hek vir 'n hele lêer vol aksies). */
async function hek(): Promise<SupabaseClient> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Nie aangemeld nie");
  if (!toegelaat(user.email)) throw new Error("Nie toegelaat nie");
  return winkelKlient();
}

/* Selfde patroon as web/lib/winkel/valideer.ts se UUID. Elke aksie wat 'n
   id/produkId/variantId aanneem, valideer dit hiermee EERSTE — voor enige
   DB- of berging-oproep — sodat 'n misvormde id nooit 'n weesobjek in
   winkel-fotos of 'n .eq()-vraag met 'n onbetroubare string veroorsaak nie. */
const UUID_PATROON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function valideerId(id: string, veld: string): void {
  if (!UUID_PATROON.test(id)) throw new Error(`Ongeldige ${veld}.`);
}

/* "199,50" (SA komma-desimaal), "R249" of "R 1 234,00" (SA duisende-spasie)
   -> sent. Stroop 'n voorvoegende "R", stroop ALLE spasies (nie net aan die
   punte nie — "1 234" is duisende-groepering, nie 'n skeiding tussen twee
   getalle nie), en verander DAN die komma na 'n punt, VOOR parseFloat —
   "199,50" -> 19950, "R249" -> 24900, "R 1 234,00" -> 123400. 'n Kaal
   parseFloat sou "199,50" by die komma afkap (19900) en "1 234,00" by die
   spasie afkap (100) — stilweg verkeerde sent in 'n app wie se eie rand()
   komma-desimale druk. Gooi 'n Afrikaanse fout vir NaN/≤0 pleks daarvan om
   'n ongeldige produk stilweg te skep. */
function prysNaSent(f: FormData): number {
  const gestroop = String(f.get("prysRand") ?? "")
    .trim()
    .replace(/^R/i, "")
    .replace(/\s+/g, "");
  /* Meer as een komma+punt saam beteken 'n US-formaat ("1,299.00") of 'n
     tikfout ("1,2,3") — nie ons SA-komma-desimaal nie. Eén skeidingsteken
     (komma OF punt) bly die desimaal, soos voorheen; twee of meer gooi 'n
     Afrikaanse fout i.p.v. stilweg verkeerde sent te bereken. */
  const skeidingstekens = (gestroop.match(/[,.]/g) ?? []).length;
  if (skeidingstekens > 1) throw new Error("Ongeldige prys.");
  const rou = gestroop.replace(",", ".");
  const sent = Math.round(parseFloat(rou) * 100);
  if (Number.isNaN(sent) || sent <= 0) throw new Error("Ongeldige prys.");
  return sent;
}

function slugVanNaam(naam: string): string {
  return naam
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function skepProduk(f: FormData): Promise<{ id: string }> {
  const wk = await hek();
  const naam = String(f.get("naam") ?? "").trim();
  if (!naam) throw new Error("Naam is verpligtend.");
  const beskrywing = String(f.get("beskrywing") ?? "").trim();
  const prys_sent = prysNaSent(f);
  const slug = slugVanNaam(naam);
  if (!slug) throw new Error("Kon nie 'n slug uit die naam aflei nie — gee 'n naam met letters of syfers.");
  const { data, error } = await wk
    .from("winkel_produkte")
    .insert({ naam, beskrywing, prys_sent, slug, aktief: false })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Daardie slug bestaan reeds — kies 'n ander naam of slug.");
    throw new Error(`Kon nie produk skep nie: ${error.message}`);
  }
  revalidatePath("/produkte");
  return { id: data.id as string };
}

export async function wysigProduk(id: string, f: FormData): Promise<void> {
  const wk = await hek();
  valideerId(id, "produk-id");
  const naam = String(f.get("naam") ?? "").trim();
  if (!naam) throw new Error("Naam is verpligtend.");
  const beskrywing = String(f.get("beskrywing") ?? "").trim();
  const prys_sent = prysNaSent(f);
  const slug = String(f.get("slug") ?? "").trim();
  if (!slug) throw new Error("Slug is verpligtend.");
  const { error } = await wk.from("winkel_produkte").update({ naam, beskrywing, prys_sent, slug }).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Daardie slug bestaan reeds — kies 'n ander naam of slug.");
    throw new Error(`Kon nie produk wysig nie: ${error.message}`);
  }
  revalidatePath("/produkte");
}

export async function stelProdukAktief(id: string, aktief: boolean): Promise<void> {
  const wk = await hek();
  valideerId(id, "produk-id");
  const { error } = await wk.from("winkel_produkte").update({ aktief }).eq("id", id);
  if (error) throw new Error(`Kon nie produk se status wysig nie: ${error.message}`);
  revalidatePath("/produkte");
}

export async function stelVoorraad(variantId: string, voorraad: number): Promise<void> {
  if (!Number.isInteger(voorraad) || voorraad < 0) throw new Error("Voorraad moet 'n heelgetal ≥ 0 wees.");
  const wk = await hek();
  valideerId(variantId, "variant-id");
  const { error } = await wk.from("winkel_variante").update({ voorraad }).eq("id", variantId);
  if (error) throw new Error(`Kon nie voorraad opdateer nie: ${error.message}`);
  revalidatePath("/produkte");
}

export async function stelVariantAktief(variantId: string, aktief: boolean): Promise<void> {
  const wk = await hek();
  valideerId(variantId, "variant-id");
  const { error } = await wk.from("winkel_variante").update({ aktief }).eq("id", variantId);
  if (error) throw new Error(`Kon nie variant se status wysig nie: ${error.message}`);
  revalidatePath("/produkte");
}

/* Voeg 'n nuwe kleur by 'n produk. As die produk reeds grootte-variante het
   (enige ry met 'n nie-nul grootte), kry die nuwe kleur ELKE grootte; anders
   kry dit een grootte-lose variant. Die DB se
   `unique nulls not distinct (produk_id, kleur, grootte)`-beperking is die
   agtervanger — ons vang 'n 23505 en gee dieselfde vriendelike boodskap. */
export async function voegKleurBy(produkId: string, kleur: string): Promise<void> {
  const wk = await hek();
  valideerId(produkId, "produk-id");
  const kleurGeskoon = kleur.trim();
  if (!kleurGeskoon) throw new Error("Kleur is verpligtend.");
  const { data: bestaande, error: leesFout } = await wk
    .from("winkel_variante")
    .select("kleur, grootte")
    .eq("produk_id", produkId);
  if (leesFout) throw new Error(`Kon nie bestaande variante lees nie: ${leesFout.message}`);
  if ((bestaande ?? []).some((v) => v.kleur === kleurGeskoon)) {
    throw new Error("Daardie kleur bestaan reeds.");
  }
  const hetGroottes = (bestaande ?? []).some((v) => v.grootte !== null);
  const rye: { produk_id: string; kleur: string; grootte: string | null; voorraad: number }[] = hetGroottes
    ? GROOTTES.map((grootte) => ({ produk_id: produkId, kleur: kleurGeskoon, grootte, voorraad: 0 }))
    : [{ produk_id: produkId, kleur: kleurGeskoon, grootte: null, voorraad: 0 }];
  const { error } = await wk.from("winkel_variante").insert(rye);
  if (error) {
    if (error.code === "23505") throw new Error("Daardie kleur bestaan reeds.");
    throw new Error(`Kon nie kleur byvoeg nie: ${error.message}`);
  }
  revalidatePath("/produkte");
}

/* Voeg 'n nuwe grootte by vir elke bestaande kleur van die produk. Slaan
   kombinasies oor wat reeds bestaan i.p.v. op die DB-beperking te bots. */
export async function voegGrootteBy(produkId: string, grootte: string): Promise<void> {
  const wk = await hek();
  valideerId(produkId, "produk-id");
  const grootteGeskoon = grootte.trim();
  if (!grootteGeskoon) throw new Error("Grootte is verpligtend.");
  const { data: bestaande, error: leesFout } = await wk
    .from("winkel_variante")
    .select("kleur, grootte")
    .eq("produk_id", produkId);
  if (leesFout) throw new Error(`Kon nie bestaande variante lees nie: ${leesFout.message}`);
  const kleure = Array.from(new Set((bestaande ?? []).map((v) => v.kleur)));
  const bestaandeKombinasies = new Set((bestaande ?? []).map((v) => `${v.kleur}::${v.grootte}`));
  const rye = kleure
    .filter((kleur) => !bestaandeKombinasies.has(`${kleur}::${grootteGeskoon}`))
    .map((kleur) => ({ produk_id: produkId, kleur, grootte: grootteGeskoon, voorraad: 0 }));
  if (rye.length === 0) {
    revalidatePath("/produkte");
    return;
  }
  const { error } = await wk.from("winkel_variante").insert(rye);
  if (error) {
    if (error.code === "23505") throw new Error("Daardie kleur-grootte-kombinasie bestaan reeds.");
    throw new Error(`Kon nie grootte byvoeg nie: ${error.message}`);
  }
  revalidatePath("/produkte");
}

const TOEGELATE_FOTOTIPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAKS_FOTO_GROOTTE = 4 * 1024 * 1024;

export async function laaiFotoOp(produkId: string, f: FormData): Promise<void> {
  const wk = await hek();
  valideerId(produkId, "produk-id");
  const foto = f.get("foto");
  if (!(foto instanceof File) || foto.size === 0) throw new Error("Geen foto gekies nie.");
  if (foto.size > MAKS_FOTO_GROOTTE) throw new Error("Foto is te groot (maks 4MB).");
  if (!TOEGELATE_FOTOTIPES.has(foto.type)) throw new Error("Slegs JPEG-, PNG- of WEBP-foto's word aanvaar.");

  const naamGeskoon = foto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const pad = `${produkId}/${Date.now()}-${naamGeskoon}`;
  const buffer = Buffer.from(await foto.arrayBuffer());

  const { error: laaiFout } = await wk.storage
    .from("winkel-fotos")
    .upload(pad, buffer, { contentType: foto.type });
  if (laaiFout) throw new Error(`Kon nie foto oplaai nie: ${laaiFout.message}`);

  const {
    data: { publicUrl },
  } = wk.storage.from("winkel-fotos").getPublicUrl(pad);

  const { data: produk, error: leesFout } = await wk
    .from("winkel_produkte")
    .select("fotos")
    .eq("id", produkId)
    .single();
  if (leesFout) throw new Error(`Kon nie produk se foto's lees nie: ${leesFout.message}`);

  const nuweFotos = [...((produk?.fotos as string[]) ?? []), publicUrl];
  const { error } = await wk.from("winkel_produkte").update({ fotos: nuweFotos }).eq("id", produkId);
  if (error) throw new Error(`Kon nie foto stoor nie: ${error.message}`);
  revalidatePath("/produkte");
}

/* Verwyder net die URL uit produkte.fotos — die storage-objek self bly
   staan (goedkoop, en bestellings/eposse kan steeds daarna verwys). */
export async function verwyderFoto(produkId: string, url: string): Promise<void> {
  const wk = await hek();
  valideerId(produkId, "produk-id");
  const { data: produk, error: leesFout } = await wk
    .from("winkel_produkte")
    .select("fotos")
    .eq("id", produkId)
    .single();
  if (leesFout) throw new Error(`Kon nie produk se foto's lees nie: ${leesFout.message}`);
  const nuweFotos = ((produk?.fotos as string[]) ?? []).filter((f) => f !== url);
  const { error } = await wk.from("winkel_produkte").update({ fotos: nuweFotos }).eq("id", produkId);
  if (error) throw new Error(`Kon nie foto verwyder nie: ${error.message}`);
  revalidatePath("/produkte");
}

export async function skuifFoto(produkId: string, url: string, rigting: "op" | "af"): Promise<void> {
  const wk = await hek();
  valideerId(produkId, "produk-id");
  const { data: produk, error: leesFout } = await wk
    .from("winkel_produkte")
    .select("fotos")
    .eq("id", produkId)
    .single();
  if (leesFout) throw new Error(`Kon nie produk se foto's lees nie: ${leesFout.message}`);
  const fotos = [...((produk?.fotos as string[]) ?? [])];
  const i = fotos.indexOf(url);
  const j = rigting === "op" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= fotos.length) return; // niks om te skuif nie
  [fotos[i], fotos[j]] = [fotos[j], fotos[i]];
  const { error } = await wk.from("winkel_produkte").update({ fotos }).eq("id", produkId);
  if (error) throw new Error(`Kon nie foto's herrangskik nie: ${error.message}`);
  revalidatePath("/produkte");
}
