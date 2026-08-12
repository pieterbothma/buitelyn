import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AANDELE } from "@/lib/aandele";
import { cronGeweier } from "@/lib/cron-hek";

export const maxDuration = 300;

/* Genereer die eenmalige inhoud vir /aandele-blaaie: 250-400 woorde unieke
   Afrikaanse profiel-prosa (Gemini) + 'n brand-styl illustrasie
   (gemini-2.5-flash-image, die mid-century tweekleur-styl). Loop 4 op 'n slag
   tot alles vol is; bestaande rye word nooit oorskryf nie (mens-hersienbaar). */

const STYL =
  "authentic 1950s mid-century commercial book illustration, strictly limited TWO-COLOUR palette of black plus dusty rose-mauve, flat shapes on cream off-white textured paper, loose confident ink-brush linework, charmingly elongated stylised figures and objects, generous negative space, no gradients, absolutely no text or letters or numbers";

export async function GET(request: NextRequest) {
  const geweier = cronGeweier(request);
  if (geweier) return geweier;
  const sb = createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: bestaande } = await sb.from("aandeel_profiele").select("slug, profiel_teks, beeld_url");
  const klaar = new Map((bestaande ?? []).map((r) => [r.slug, r]));
  const agterstand = AANDELE.filter((a) => {
    const r = klaar.get(a.slug);
    return !r || !r.profiel_teks || !r.beeld_url;
  }).slice(0, 4);
  if (!agterstand.length) return NextResponse.json({ ok: true, rede: "alles vol", totaal: AANDELE.length });

  const uit: string[] = [];
  for (const a of agterstand) {
    const ry = klaar.get(a.slug);

    // 1. profiel-prosa (eenmalig)
    let teks = ry?.profiel_teks ?? null;
    if (!teks) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Skryf 'n maatskappyprofiel van ${a.naam} (aandeelkode ${a.simbool.replace(".JO", "")}, ${a.land === "za" ? "genoteer op die JSE" : "genoteer in Amerika, gewild onder Suid-Afrikaanse beleggers"}) vir 'n Afrikaanse beleggingswebwerf.

Reëls:
- 250 tot 350 woorde, 3-4 vloeiende paragrawe, GEEN opskrifte of kolpunte nie.
- Dek: waar die maatskappy vandaan kom (kort geskiedenis), hoe hy sy geld verdien (sy afdelings/produkte), en sy plek in die mark${a.land === "za" ? " en in Suid-Afrika se ekonomie" : " en hoekom SA-beleggers hom hou"}.
- Feite wat tydloos is — GEEN pryse, waardasies, onlangse nuus of syfers wat verouder nie. Geen jaartal-spesifieke stellings ná 2024 nie.
- Suiwer hedendaagse Afrikaans; NOOIT Nederlandse of Duitse woorde nie; nie "teg" nie (sê "tegnologie").
- Neutrale, joernalistieke toon — geen aanbevelings of "goeie belegging"-taal nie.
- Antwoord NET met die profiel.`,
                    },
                  ],
                },
              ],
              generationConfig: { temperature: 0.4 },
            }),
          }
        );
        const d = await res.json();
        teks = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
      } catch {
        /* volgende lopie */
      }
    }

    // 2. illustrasie (eenmalig)
    let beeldUrl = ry?.beeld_url ?? null;
    if (!beeldUrl) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${STYL}. A wide banner scene symbolising the business of ${a.naam}: ${bedryfsBeeld(a.naam)}. Landscape 16:9 composition.`,
                    },
                  ],
                },
              ],
            }),
          }
        );
        const d = await res.json();
        const deel = (d?.candidates?.[0]?.content?.parts ?? []).find(
          (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData
        );
        if (deel?.inlineData?.data) {
          const buf = Buffer.from(deel.inlineData.data, "base64");
          const pad = `${a.slug}.png`;
          const { error } = await sb.storage.from("aandele-beelde").upload(pad, new Blob([new Uint8Array(buf)], { type: "image/png" }), {
            contentType: "image/png",
            upsert: true,
            cacheControl: "31536000",
          });
          if (!error) beeldUrl = `${process.env.APHQ_SUPABASE_URL}/storage/v1/object/public/aandele-beelde/${pad}`;
        }
      } catch {
        /* volgende lopie */
      }
    }

    await sb.from("aandeel_profiele").upsert(
      {
        slug: a.slug,
        simbool: a.simbool,
        naam: a.naam,
        profiel_teks: teks,
        beeld_url: beeldUrl,
        opgedateer_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );
    uit.push(`${a.slug}:${teks ? "t" : "-"}${beeldUrl ? "b" : "-"}`);
  }

  const oor = AANDELE.length - (bestaande?.filter((r) => r.profiel_teks && r.beeld_url).length ?? 0) - uit.filter((u) => u.endsWith("tb")).length;
  return NextResponse.json({ ok: true, verwerk: uit, oor });
}

/** Kort Engelse toneelbeskrywing per maatskappy vir die illustrasie-prompt. */
function bedryfsBeeld(naam: string): string {
  const kaart: Record<string, string> = {
    Naspers: "an old printing press transforming into satellites and connected screens",
    Prosus: "a globe wrapped in glowing connection lines between continents",
    Capitec: "a friendly neighbourhood bank branch with people queuing happily",
    FirstRand: "a strong bank facade with an oak tree growing beside it",
    "Standard Bank": "a grand bank building with a shield emblem",
    Absa: "a modern bank tower over a bustling African street market",
    Nedbank: "a green-leaning bank building with a tree canopy",
    Investec: "a zebra standing before a skyline of financial towers",
    Sanlam: "an umbrella sheltering a family, coins falling like rain",
    "Old Mutual": "an anchor and a ledger book on a banker's desk",
    Discovery: "a runner on a track with a shield and a heartbeat line",
    OUTsurance: "an umbrella over a small car and house",
    Remgro: "a branching family tree with company crests as leaves",
    MTN: "a radio mast beaming signals over African hills at dusk",
    Vodacom: "a cellphone tower connecting villages and cities",
    Telkom: "telephone lines stretching across a Karoo landscape",
    Sasol: "industrial refinery towers with flowing pipelines",
    "Anglo American": "a vast open-pit mine with tiny haul trucks",
    BHP: "a mountain being carved into ore and steel",
    Glencore: "cargo ships and trains carrying ore across the world",
    "Impala Platinum": "a platinum ring rising from a deep mineshaft headgear",
    "Sibanye-Stillwater": "miners' headlamps in a deep tunnel of glittering ore",
    "AngloGold Ashanti": "gold bars stacked beside a mine headframe",
    "Gold Fields": "a gold pan with nuggets under a rising sun",
    Harmony: "a deep mineshaft elevator with gold veins in the rock",
    Exxaro: "coal wagons rolling through grassland toward a power station",
    "Kumba Yster": "red iron-ore trains crossing the Northern Cape",
    Shoprite: "a busy supermarket trolley overflowing with groceries",
    Woolworths: "an elegant food hall with fresh produce beautifully arranged",
    Clicks: "a pharmacy counter with medicine bottles and a mortar",
    "Dis-Chem": "a family pharmacy with a heart and cross",
    Spar: "a friendly corner grocery store with a pine tree sign",
    TFG: "fashion mannequins in a stylish shop window",
    "Mr Price": "colourful clothing racks with price tags fluttering",
    "Pick n Pay": "a shopping basket with fresh bread and milk",
    "Bid Corp": "a chef's kitchen receiving crates of fresh ingredients",
    Bidvest: "a fleet of delivery vans fanning out from a warehouse",
    Aspen: "laboratory flasks and pill bottles on a clean bench",
    Netcare: "a hospital building with a nurse and an ambulance",
    Richemont: "a luxury wristwatch and jewellery on velvet",
    "AB InBev": "beer barrels and overflowing glasses in a brewery",
    "British American Tobacco": "tobacco leaves drying in a wooden barn",
    Apple: "a sleek smartphone and laptop on a minimalist desk",
    Microsoft: "office windows forming a glowing four-pane grid",
    Nvidia: "a glowing computer chip radiating circuits like a sun",
    "Alphabet (Google)": "a magnifying glass over a map of the world's information",
    Amazon: "parcels flowing down a river between warehouse shelves",
    "Meta (Facebook)": "people connected by threads across a globe",
    Tesla: "an electric car charging under a solar canopy",
    Netflix: "a family watching a glowing screen in a dark lounge",
    Broadcom: "circuit boards connected by beams of light",
    "JPMorgan Chase": "a grand vault door in a marble banking hall",
  };
  return kaart[naam] ?? "an elegant abstract composition of commerce and growth";
}
