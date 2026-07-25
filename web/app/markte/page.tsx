import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { MarkteTerminal } from "@/components/markte/terminal";
import { getQuotes } from "@/lib/markets/source";
import { kryNuus } from "@/lib/markets/nuus";
import { ALLE_SIMBOLE, jseIsOop } from "@/lib/markets/boards";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Markte — Buitelyn",
  description: "JSE, rand, kommoditeite en kripto — live, met Buitelyn se KI-markassistent.",
};

async function kryOorsig(): Promise<string | null> {
  if (!process.env.APHQ_SUPABASE_URL || !process.env.APHQ_SUPABASE_SERVICE_KEY) return null;
  try {
    const sb = createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const { data } = await sb
      .from("markte_oorsigte")
      .select("teks, datum")
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.teks ?? null;
  } catch {
    return null;
  }
}

export default async function MarktePage() {
  const [kwotasies, oorsig, nuus] = await Promise.all([
    getQuotes(ALLE_SIMBOLE),
    kryOorsig(),
    kryNuus(),
  ]);
  const oop = jseIsOop();
  const dateline = new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toUpperCase();

  return (
    <>
      <TopBar />
      <main className="flex-1">
        <section className="mx-auto max-w-[1440px] px-6 py-10 md:px-14">
          <div className="border-y-2 border-ink">
            <div className="my-1 flex flex-wrap items-baseline justify-between gap-2 border-y border-ink py-3">
              <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Markte</h1>
              <p className="flex items-center gap-3 text-xs tracking-[0.2em] text-ink/60">
                {dateline}
                <span className="flex items-center gap-1.5 font-semibold">
                  <span
                    aria-hidden
                    className={`size-2 rounded-full ${oop ? "bg-green" : "bg-red"}`}
                  />
                  JSE {oop ? "OOP" : "TOE"}
                </span>
                <span>VERTRAAG ±15 MIN</span>
              </p>
            </div>
          </div>

          {oorsig ? (
            <div className="mt-6 border-2 border-ink bg-offwhite p-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink/50">
                VANDAG OP DIE MARKTE
                <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
              </p>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed">{oorsig}</p>
            </div>
          ) : null}

          <div className="mt-8">
            <MarkteTerminal aanvanklik={kwotasies} nuus={nuus} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
