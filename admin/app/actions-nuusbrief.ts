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
  const [{ data: oorsig }, { data: nuus }] = await Promise.all([
    sb.from("markte_oorsigte").select("teks").eq("datum", datum).maybeSingle(),
    sb
      .from("markte_nuus")
      .select("titel_af, opsomming, bron, skakel, gepubliseer")
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
    .map((n) => `- [${n.bron}] ${n.titel_af}: ${n.opsomming} (${n.skakel})`)
    .join("\n");

  const datumWoorde = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const teks = await skryfAfrikaans(
    `Skryf 'n volledige Substack-nuusbrief-KONSEP vir Buitelyn (Afrikaanse sake-nuus; stem: helder, warm, bietjie speels, geen clichés) vir ${datumWoorde}. André-Pierre redigeer dit self, so dis 'n sterk eerste weergawe, nie 'n raamwerk nie.

Struktuur (markdown):
1. 'n Pakkende titel-reël (# opskrif) met een relevante emoji.
2. 'n Kort intro-groet (2-3 sinne) wat die dag se markgevoel vasvang.
3. **Die kern in 3** — die 3 belangrikste stories uit die nuuslys hieronder: elk 'n vetgedrukte opskriffie, 2-3 sinne in jou eie woorde, en die bronskakel op sy eie reël.
4. **Op die markte** — een paragraaf uit die dagoorsig se gegewens, met die syfers natuurlik ingeweef (rand, Top 40, goud, Bitcoin).
5. 'n Kort afsluiting met 'n verwysing na die volle terminal by buitelyn.com/markte en 'n groet.

Dagoorsig: ${oorsig?.teks ?? "(nog nie beskikbaar nie)"}

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
