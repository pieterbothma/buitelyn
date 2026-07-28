"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { skryfAfrikaans } from "@/lib/gemini";

function vandagSAST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
}

/** Trek die markte-payload (dagoorsig + nuus + live kwotasies) en laat
 *  Gemini 'n volledige Substack-konsep in die Buitelyn-stem skryf. */
export async function skepNuusbriefKonsep(): Promise<string | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const datum = vandagSAST();
  /* Varsheid: net stories uit die laaste 18 uur — behalwe Maandae, wanneer
     18u net tot Sondagmiddag strek (dooie nuusdag); dan dek ons die naweek
     terug tot Vrydag met 72u. */
  const dagSAST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Johannesburg" })
  ).getDay();
  const vensterUre = dagSAST === 1 ? 72 : 18;
  const drempel = new Date(Date.now() - vensterUre * 60 * 60 * 1000).toISOString();

  const [{ data: oorsig }, { data: nuus }] = await Promise.all([
    sb.from("markte_oorsigte").select("teks").eq("datum", datum).maybeSingle(),
    sb
      .from("markte_nuus")
      .select("titel_af, opsomming, bron, skakel, gepubliseer")
      .gte("gepubliseer", drempel)
      .order("gepubliseer", { ascending: false })
      .limit(8),
  ]);

  let syfers = "";
  try {
    const res = await fetch("https://www.buitelyn.com/api/markte/quotes", {
      next: { revalidate: 300 },
    });
    const { kwotasies } = (await res.json()) as {
      kwotasies: { simbool: string; prys: number; geldeenheid: string; deltaPersent: number | null }[];
    };
    const wil = ["STX40.JO", "ZAR=X", "GC=F", "BTC-ZAR", "NPN.JO", "SOL.JO"];
    syfers = kwotasies
      .filter((k) => wil.includes(k.simbool))
      .map(
        (k) =>
          `${k.simbool}: ${k.prys.toFixed(2)} ${k.geldeenheid} (${
            k.deltaPersent != null ? (k.deltaPersent >= 0 ? "+" : "") + k.deltaPersent.toFixed(2) + "%" : "?"
          })`
      )
      .join("; ");
  } catch {
    /* sonder syfers is ook 'n nuusbrief */
  }

  const nuusLys = (nuus ?? [])
    .map((n, i) => `${i + 1}. [${n.bron}] ${n.titel_af}: ${n.opsomming} — SKAKEL: ${n.skakel}`)
    .join("\n");

  const datumWoorde = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const teks = await skryfAfrikaans(
    `Skryf 'n Substack-nuusbrief-KONSEP vir Buitelyn vir ${datumWoorde}, in André-Pierre se presiese huisstyl (hy redigeer self — skryf 'n sterk eerste weergawe, nie 'n raamwerk nie).

DIE HUISSTYL (uit die laaste 10 uitgawes — volg dit getrou):
- TITEL: 2-3 kort onderwerpe met emoji's, speels, bv "🍑 Blatjang, ✈️ Boeing en 🤖 bots" of "De Beers, BYD & Bitcoin". Nooit 'n saai opsomming nie.
- OPEN ALTYD met: "Oor die volgende X minute en Y sekondes:" (skat die leestyd uit die lengte, ±200 woorde per minuut) gevolg deur een knipoog-sin wat die 3 stories teaser-gewys opsom.
- KIES NET DIE 3 SAPPIGSTE stories uit die nuuslys — nie almal nie. Elke storie kry:
  - 'n kort, speelse opskrif (## ), bv "Kganyago hou koerse in die kraal" of "Boeing beter begin bou";
  - direk daaronder 'n kursiewe eenreël-byskrif met droë humor (soos 'n foto-onderskrif), bv "*Ek en die Gov (nie in die kraal nie).*";
  - 2-4 kort paragrawe met die kern;
  - emoji-gemerkte vetgedrukte etikette vir die analise, bv "🍑 **Hoekom nou:**", "💣 **Wat dit beteken:**", "**Die Syfers:**";
  - die bronskakel aan die einde van die storie op sy eie reël.
- Maatskappye kry hul ticker inline waar syfers beskikbaar is: "Richemont (JSE:CFR ▲ 6,4%)".
- VET belangrike syfers en bedrae. Kort sinne. Afrikaans met so nou en dan 'n Engelse frase ("so bear with me", "Hold my bubble tea", "the DL") — spaarsamig, nooit geforseerd nie.
- Alledaagse SA-verwysings waar dit natuurlik pas (Checkers, Takealot, Uber Eats, die Paarl).
- Oorgange soos "Maar eers …", "MEANWHILE:", "Gepraat van X, …".
- Sluit met 'n kort "Hoe lyk die rand:"-tipe markblokkie (weef die syfers hieronder natuurlik in) en 'n een-sin-groet met 'n verwysing na buitelyn.com/markte.
- André-Pierre strooi persoonlike staaltjies in — MOENIE dit versin nie. Los presies EEN merker "[Jou staaltjie hier?]" op die natuurlikste plek.

TAALREËLS (streng):
- Skryf suiwer hedendaagse Afrikaans — NOOIT Nederlandse, Vlaamse of Duitse woorde nie (bv. 'achtbaan' is Nederlands). As jy twyfel of 'n woord regte Afrikaans is, gebruik eerder die Engelse leenwoord (bv. 'rollercoaster') of 'n gewone Afrikaanse alternatief.
- NOOIT "teg" as afkorting vir tegnologie nie — dis nie 'n regte afkorting nie. Skryf "tech" (soos AP dit self gebruik: "Groot week vir tech") of voluit "tegnologie".

GRONDREËLS (absoluut — oortreding maak die hele konsep waardeloos):
- Elke storie MOET een van die genommerde items uit die nuuslys hieronder wees. Jy mag NOOIT 'n storie, gebeurtenis, aankondiging of feit uit jou eie geheue byvoeg nie — al lyk dit relevant.
- Elke storie sluit af met die PRESIESE SKAKEL-URL van daardie item, verbatim, as 'n markdown-skakel: [bron](url). GEEN plekhouer-verwysings soos "[Lees meer hier: X]" nie.
- Syfers kom SLEGS uit die nuuslys, die dagoorsig of die syfers-reël hieronder. As jy 'n syfer nie het nie, laat dit uit — moenie skat nie.
- As daar minder as 3 sterk stories in die lys is, skryf minder stories; moenie opmaak om by 3 uit te kom nie.
- Die Engelse frases in die stylgids is VOORBEELDE van die register — moenie hulle woordeliks kopieer nie; skryf jou eie waar dit natuurlik pas.

Dagoorsig (agtergrond, moenie woordeliks kopieer nie): ${oorsig?.teks ?? "(nog nie beskikbaar nie)"}

Syfers: ${syfers || "(nie beskikbaar nie)"}

Nuuslys:
${nuusLys || "(geen items nie)"}

Antwoord NET met die markdown-konsep.`
  );
  if (!teks) return null;

  await sb
    .from("nuusbrief_konsepte")
    .upsert({ datum, teks, opgedateer_at: new Date().toISOString() }, { onConflict: "datum" });
  revalidatePath("/w/buitelyn/konsep");
  return teks;
}

export type FotoIdee = { beskrywing: string; prompt: string };

/** Gemini lees vandag se konsep en stel 4 beeld-idees voor: Afrikaanse
 *  beskrywing vir AP + 'n Engelse prompt vir die beeldmodel. */
export async function kryFotoIdees(): Promise<FotoIdee[]> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data: konsep } = await sb
    .from("nuusbrief_konsepte")
    .select("teks")
    .eq("datum", vandagSAST())
    .maybeSingle();
  if (!konsep?.teks) return [];

  const antwoord = await skryfAfrikaans(
    `Hier is vandag se Buitelyn-nuusbriefkonsep. Stel presies 4 nuusbrief-illustrasie-idees voor wat by die stories pas — editoriale beeldmateriaal, nie stock-foto-clichés nie. Buitelyn se estetika: skoon, speels-ernstig, koerantagtig. Kort Afrikaanse teks ín die beeld is welkom waar dit die beeld versterk (die beeldmodel render teks uitstekend) — spesifiseer dan die PRESIESE woorde in die prompt, in aanhalingstekens, met korrekte Afrikaanse spelling. Geen regte handelsmerke of logo's nie.

Antwoord as SUIWER JSON (geen kodeblok nie): 'n lys van 4 objekte:
- "beskrywing": een Afrikaanse sin wat vir André-Pierre sê wat die beeld wys
- "prompt": 'n gedetailleerde ENGELSE prompt vir 'n beeldmodel (styl, komposisie, ligging, palet — noem "editorial newspaper illustration style, clean off-white background")

Konsep:
${konsep.teks.slice(0, 4000)}`
  );
  try {
    const skoon = (antwoord ?? "").replace(/^```json?\n?|```$/g, "").trim();
    const lys = JSON.parse(skoon);
    if (!Array.isArray(lys)) return [];
    return lys
      .slice(0, 4)
      .map((i) => ({ beskrywing: String(i?.beskrywing ?? ""), prompt: String(i?.prompt ?? "") }))
      .filter((i) => i.beskrywing && i.prompt);
  } catch {
    return [];
  }
}

export async function stoorNuusbriefKonsep(teks: string): Promise<void> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !teks.trim()) return;
  await sb
    .from("nuusbrief_konsepte")
    .upsert(
      { datum: vandagSAST(), teks, opgedateer_at: new Date().toISOString() },
      { onConflict: "datum" }
    );
  revalidatePath("/w/buitelyn/konsep");
}
