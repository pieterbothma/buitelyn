import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { MarkteTerminal } from "@/components/markte/terminal";
import { TekenIn } from "@/components/markte/teken-in";
import { TelegramKoppel } from "@/components/markte/telegram";
import { BewegersBord } from "@/components/markte/bewegers";
import { supabaseServer } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/markets/source";
import { kryNuus } from "@/lib/markets/nuus";
import { ALLE_SIMBOLE, BEWEGERS_SIMBOLE, jseIsOop } from "@/lib/markets/boards";

/* Gegateer: die hek lees die sessie-koekie, dus moet die blad dinamies
   render — die data-fetches onder het steeds hul eie fetch-cache. */
export const dynamic = "force-dynamic";

const WYS_OUDIO = true;

export const metadata: Metadata = {
  title: "Markte — Buitelyn",
  description: "JSE, rand, kommoditeite en kripto — live, met Buitelyn se KI-markassistent.",
};

async function kryOorsig(): Promise<{
  teks: string;
  bygewerk: string | null;
  oudioUrl: string | null;
  oudioDatum: string | null;
  oudioEtiket: string;
} | null> {
  if (!process.env.APHQ_SUPABASE_URL || !process.env.APHQ_SUPABASE_SERVICE_KEY) return null;
  try {
    const sb = createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const { data } = await sb
      .from("markte_oorsigte")
      .select("teks, datum, opgedateer_at, oudio_url")
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.teks) return null;
    const bygewerk = data.opgedateer_at
      ? new Intl.DateTimeFormat("af-ZA", {
          timeZone: "Africa/Johannesburg",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(data.opgedateer_at))
      : null;
    const oudioDatum = data.oudio_url
      ? new Intl.DateTimeFormat("af-ZA", {
          timeZone: "Africa/Johannesburg",
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date(`${data.datum}T12:00:00Z`))
      : null;
    const oudioEtiket = data.oudio_url?.includes("-aand.mp3")
      ? "LUISTER NA DIE DAGOPSOMMING"
      : data.oudio_url?.includes("-middag.mp3")
        ? "LUISTER NA DIE MIDDAGOORSIG"
        : "LUISTER NA DIE OGGENDOORSIG";
    return { teks: data.teks, bygewerk, oudioUrl: data.oudio_url ?? null, oudioDatum, oudioEtiket };
  } catch {
    return null;
  }
}

const TABS = [
  { sleutel: "tuis", naam: "Tuis" },
  { sleutel: "bewegers", naam: "Bewegers" },
  { sleutel: "liga", naam: "Liga" },
  { sleutel: "sens", naam: "SENS" },
  { sleutel: "telegram", naam: "Telegram" },
] as const;
type TabSleutel = (typeof TABS)[number]["sleutel"];

function Binnekort({ titel, teks }: { titel: string; teks: string }) {
  return (
    <div className="max-w-xl border-2 border-ink bg-offwhite p-6">
      <p className="text-xs font-semibold tracking-[0.16em]">
        {titel.toUpperCase()}
        <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
        <span className="ml-3 font-normal text-ink/50">BINNEKORT</span>
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink/70">{teks}</p>
    </div>
  );
}

export default async function MarktePage({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string }>;
}) {
  const { blad } = await searchParams;
  const tab: TabSleutel = TABS.some((t) => t.sleutel === blad) ? (blad as TabSleutel) : "tuis";
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return (
      <>
        <TopBar />
        <main className="flex-1">
          <section className="mx-auto max-w-[1440px] px-6 py-10 md:px-14">
            <div className="border-y-2 border-ink">
              <div className="my-1 border-y border-ink py-3">
                <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Markte</h1>
              </div>
            </div>
            <div className="mx-auto mt-10 max-w-md border-2 border-ink bg-offwhite p-6">
              <p className="text-xs font-semibold tracking-[0.16em]">
                NET VIR INGETEKENDE LESERS
                <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                Live JSE-borde, die rand, kommoditeite en kripto — met Buitelyn se
                KI-markassistent en jou eie portefeulje wat oral saamgaan. Gratis, net &apos;n
                rekening nodig.
              </p>
              <div className="mt-4">
                <TekenIn />
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const { data: profiel } = await sb
    .from("profiele")
    .select("naam")
    .eq("user_id", user.id)
    .maybeSingle();
  const rouNaam =
    profiel?.naam?.split(" ")[0] ??
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "";
  const naam = rouNaam ? rouNaam.charAt(0).toUpperCase() + rouNaam.slice(1) : "";

  // Haal net wat die aktiewe oortjie nodig het
  const [kwotasies, oorsig, nuus, bewegers] = await Promise.all([
    tab === "tuis" ? getQuotes(ALLE_SIMBOLE) : Promise.resolve([]),
    tab === "tuis" ? kryOorsig() : Promise.resolve(null),
    tab === "tuis" ? kryNuus() : Promise.resolve([]),
    tab === "bewegers"
      ? getQuotes(BEWEGERS_SIMBOLE.map((i) => i.simbool))
      : Promise.resolve([]),
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
              <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">
                Markte
                {naam ? (
                  <span className="ml-3 align-middle text-base font-normal tracking-normal text-ink/60">
                    Hallo, {naam}
                    <span aria-hidden className="ml-1.5 inline-block size-1.5 rounded-full bg-red align-middle" />
                  </span>
                ) : null}
              </h1>
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

          {/* Oortjies */}
          {/* Op mobiel dien die hamburger as oortjie-nav — die balk is net md+ */}
          <nav className="mt-6 hidden flex-wrap border-2 border-ink bg-offwhite md:flex">
            {TABS.map((t) => (
              <Link
                key={t.sleutel}
                href={t.sleutel === "tuis" ? "/markte" : `/markte?blad=${t.sleutel}`}
                className={`border-r border-ink/20 px-5 py-2.5 text-xs font-semibold tracking-[0.14em] last:border-r-0 ${
                  tab === t.sleutel ? "bg-ink text-offwhite" : "hover:bg-paper"
                }`}
              >
                {t.naam.toUpperCase()}
              </Link>
            ))}
          </nav>

          {tab === "bewegers" ? (
            <div className="mt-6">
              <BewegersBord kwotasies={bewegers} />
            </div>
          ) : null}

          {tab === "liga" ? (
            <div className="mt-6">
              <Binnekort
                titel="Buitelyn Liga"
                teks="Fantasie-JSE: R100 000 denkbeeldige geld, maandelikse ranglys en 'n jaarlikse eindstand — met jou naam op die show as jy wen. Ons bou dit nou."
              />
            </div>
          ) : null}

          {tab === "sens" ? (
            <div className="mt-6">
              <Binnekort
                titel="SENS in Afrikaans"
                teks="Elke JSE-aankondiging (resultate, dividende, direkteurshandel) in een verstaanbare Afrikaanse paragraaf, met jou eie aandele boaan. Ons bou dit nou."
              />
            </div>
          ) : null}

          {tab === "telegram" ? (
            <div className="mt-6">
              <TelegramKoppel />
            </div>
          ) : null}

          {tab === "tuis" && oorsig ? (
            <div className="mt-6 border-2 border-ink bg-offwhite p-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink/50">
                VANDAG OP DIE MARKTE
                <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
                {oorsig.bygewerk ? (
                  <span className="ml-3 font-normal">BYGEWERK {oorsig.bygewerk}</span>
                ) : null}
              </p>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed">{oorsig.teks}</p>
            </div>
          ) : null}

          {/* Aparte oggend-oudio: die teks hierbo verfris uurliks, die
              briefing is die 06:50-oggenduitgawe — eie boks, eie datum. */}
          {tab === "tuis" && WYS_OUDIO && oorsig?.oudioUrl ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-2 border-ink bg-offwhite px-5 py-3">
              <p className="text-[11px] font-semibold tracking-[0.16em]">
                {oorsig.oudioEtiket}
                {oorsig.oudioDatum ? ` — ${oorsig.oudioDatum.toUpperCase()}` : ""}
                <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls preload="none" src={oorsig.oudioUrl} className="h-9 min-w-64 max-w-md flex-1" />
            </div>
          ) : null}

          {tab === "tuis" ? (
            <div className="mt-8">
              <MarkteTerminal aanvanklik={kwotasies} nuus={nuus} />
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </>
  );
}
