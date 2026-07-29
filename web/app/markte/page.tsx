import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { MarkteTerminal } from "@/components/markte/terminal";
import { TekenIn } from "@/components/markte/teken-in";
import { TelegramKoppel } from "@/components/markte/telegram";
import { BewegersBord } from "@/components/markte/bewegers";
import { SensBord, type SensItem } from "@/components/markte/sens";
import { LigaBord } from "@/components/markte/liga";
import { PortefeuljeBlad, type BladHouding, type Waarskuwing, type Dividend } from "@/components/markte/portefeulje-blad";
import { SakgeldBlad } from "@/components/markte/sakgeld-blad";
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

async function kryNotas(): Promise<Record<string, string>> {
  if (!process.env.APHQ_SUPABASE_URL || !process.env.APHQ_SUPABASE_SERVICE_KEY) return {};
  try {
    const sb = createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const dagFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" });
    const vandag = dagFmt.format(new Date());
    const gister = dagFmt.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
    // albei dae, oudste eerste — vandag s'n oorskryf gister s'n per simbool
    const { data } = await sb
      .from("skuiwer_notas")
      .select("simbool, nota, datum")
      .in("datum", [gister, vandag])
      .order("datum", { ascending: true });
    return Object.fromEntries((data ?? []).map((r) => [r.simbool, r.nota]));
  } catch {
    return {};
  }
}

async function krySens(): Promise<SensItem[]> {
  if (!process.env.APHQ_SUPABASE_URL || !process.env.APHQ_SUPABASE_SERVICE_KEY) return [];
  try {
    const sb = createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const { data } = await sb
      .from("sens_aankondigings")
      .select("sens_id, tyd, kode, maatskappy, titel, tipe, opsomming, skakel")
      .order("tyd", { ascending: false })
      .limit(80);
    return (data ?? []) as SensItem[];
  } catch {
    return [];
  }
}

export type SakgeldSyfer = { sleutel: string; naam: string; waarde: number; eenheid: string; datum_effektief: string | null };

async function krySakgeld(): Promise<SakgeldSyfer[]> {
  if (!process.env.APHQ_SUPABASE_URL || !process.env.APHQ_SUPABASE_SERVICE_KEY) return [];
  try {
    const sb = createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const { data } = await sb
      .from("sakgeld_syfers")
      .select("sleutel, naam, waarde, eenheid, datum_effektief");
    const orde = ["repo", "prima", "kpi", "petrol95", "diesel", "ppi"];
    return ((data ?? []) as SakgeldSyfer[]).sort((a, b) => orde.indexOf(a.sleutel) - orde.indexOf(b.sleutel));
  } catch {
    return [];
  }
}

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
  { sleutel: "portefeulje", naam: "Portefeulje" },
  { sleutel: "bewegers", naam: "Bewegers" },
  { sleutel: "liga", naam: "Beursliga" },
  { sleutel: "sens", naam: "SENS" },
  { sleutel: "sakgeld", naam: "Sakgeld" },
  { sleutel: "telegram", naam: "Telegram" },
] as const;
type TabSleutel = (typeof TABS)[number]["sleutel"];

export default async function MarktePage({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string; vra?: string }>;
}) {
  const { blad, vra } = await searchParams;
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
  const [kwotasies, oorsig, nuus, bewegers, notas, sensItems, sakgeld] = await Promise.all([
    tab === "tuis" ? getQuotes(ALLE_SIMBOLE) : Promise.resolve([]),
    tab === "tuis" ? kryOorsig() : Promise.resolve(null),
    tab === "tuis" ? kryNuus() : Promise.resolve([]),
    tab === "bewegers"
      ? getQuotes(BEWEGERS_SIMBOLE.map((i) => i.simbool))
      : Promise.resolve([]),
    tab === "bewegers" ? kryNotas() : Promise.resolve({}),
    tab === "sens" || tab === "portefeulje" ? krySens() : Promise.resolve([] as SensItem[]),
    tab === "tuis" || tab === "sakgeld" ? krySakgeld() : Promise.resolve([] as SakgeldSyfer[]),
  ]);
  let eieSimbole: string[] = [];
  if (tab === "sens") {
    const [{ data: h }, { data: d }] = await Promise.all([
      sb.from("portefeuljes").select("simbool").eq("user_id", user.id),
      sb.from("dophou").select("simbool").eq("user_id", user.id),
    ]);
    eieSimbole = [...new Set([...(h ?? []), ...(d ?? [])].map((r) => r.simbool))];
  }

  // Portefeulje-oortjie: houdings + kwotasies (met FX en Top 40) + SENS + notas
  let bladHoudings: BladHouding[] = [];
  let bladKwotasies: Awaited<ReturnType<typeof getQuotes>> = [];
  let bladNotas: Record<string, string> = {};
  let bladWaarskuwings: Waarskuwing[] = [];
  let bladTelegram = false;
  let bladDividende: Dividend[] = [];
  if (tab === "portefeulje") {
    const { data: h } = await sb
      .from("portefeuljes")
      .select("id, simbool, naam, aantal, koopprys, geldeenheid")
      .eq("user_id", user.id);
    bladHoudings = (h ?? []).map((r) => ({
      id: r.id,
      simbool: r.simbool,
      naam: r.naam,
      aantal: Number(r.aantal),
      koopprys: Number(r.koopprys),
      geldeenheid: r.geldeenheid ?? "ZAR",
    }));
    if (bladHoudings.length) {
      [bladKwotasies, bladNotas] = await Promise.all([
        getQuotes([
          ...new Set([...bladHoudings.map((x) => x.simbool), "STX40.JO", "ZAR=X", "EURZAR=X", "GBPZAR=X"]),
        ]),
        kryNotas(),
      ]);
    }
    const [{ data: w }, { data: tg }] = await Promise.all([
      sb
        .from("prys_waarskuwings")
        .select("id, simbool, naam, rigting, drempel, afgevuur_at, afgevuur_prys")
        .eq("user_id", user.id)
        .order("geskep_at", { ascending: false }),
      sb.from("telegram_koppelinge").select("chat_id").eq("user_id", user.id).maybeSingle(),
    ]);
    bladWaarskuwings = (w ?? []) as Waarskuwing[];
    bladTelegram = Boolean(tg?.chat_id);
    if (bladHoudings.length && process.env.APHQ_SUPABASE_URL && process.env.APHQ_SUPABASE_SERVICE_KEY) {
      const svc = createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
      });
      const kodes = bladHoudings.filter((h) => h.simbool.endsWith(".JO")).map((h) => h.simbool.replace(".JO", ""));
      if (kodes.length) {
        const vandag = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
        const { data: div } = await svc
          .from("dividend_kalender")
          .select("kode, maatskappy, bedrag_sent, ldt, betaaldatum")
          .in("kode", kodes)
          .or(`ldt.gte.${vandag},betaaldatum.gte.${vandag}`)
          .order("ldt", { ascending: true });
        bladDividende = (div ?? []) as Dividend[];
      }
    }
  }
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
                  <span className="mt-1 block text-base font-normal tracking-normal text-ink/60 md:ml-3 md:mt-0 md:inline md:align-middle">
                    Hallo, {naam}
                    <span aria-hidden className="ml-1.5 inline-block size-1.5 rounded-full bg-red align-middle" />
                  </span>
                ) : null}
              </h1>
              {/* Op mobiel: eie volwydte-reël, stywer spasiëring, items breek as
                  eenhede (nie middel-in 'n frase nie) */}
              <p className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-[0.12em] text-ink/60 md:w-auto md:justify-end md:text-xs md:tracking-[0.2em]">
                <span className="whitespace-nowrap">{dateline}</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold">
                  <span
                    aria-hidden
                    className={`size-2 rounded-full ${oop ? "bg-green" : "bg-red"}`}
                  />
                  JSE {oop ? "OOP" : "TOE"}
                </span>
                <span className="whitespace-nowrap">±15 MIN VERTRAAG</span>
              </p>
            </div>
          </div>

          {/* Oortjies */}
          {/* Mobiel: rolbare pil-strook (soos die SENS-filters) */}
          <nav className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
            {TABS.map((t) => (
              <Link
                key={t.sleutel}
                href={t.sleutel === "tuis" ? "/markte" : `/markte?blad=${t.sleutel}`}
                className={`shrink-0 whitespace-nowrap border-2 border-ink px-4 py-1.5 text-xs font-semibold tracking-[0.12em] ${
                  tab === t.sleutel ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
                }`}
              >
                {t.naam.toUpperCase()}
              </Link>
            ))}
          </nav>

          {/* Desktop: die vaste balk */}
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

          {tab === "portefeulje" ? (
            <div className="mt-6">
              <PortefeuljeBlad
                houdings={bladHoudings}
                kwotasies={bladKwotasies}
                sens={sensItems.filter((i) => i.kode && bladHoudings.some((h) => h.simbool === `${i.kode}.JO`))}
                notas={bladNotas}
                waarskuwings={bladWaarskuwings}
                telegramGekoppel={bladTelegram}
                dividende={bladDividende}
              />
            </div>
          ) : null}

          {tab === "bewegers" ? (
            <div className="mt-6">
              <BewegersBord kwotasies={bewegers} notas={notas} />
            </div>
          ) : null}

          {tab === "liga" ? (
            <div className="mt-6">
              <LigaBord profielNaam={naam} />
            </div>
          ) : null}

          {tab === "sens" ? (
            <div className="mt-6">
              <SensBord items={sensItems} eieSimbole={eieSimbole} />
            </div>
          ) : null}

          {tab === "sakgeld" ? (
            <div className="mt-6">
              <SakgeldBlad syfers={sakgeld} />
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

          {tab === "tuis" && sakgeld.length ? (
            <Link href="/markte?blad=sakgeld" className="mt-4 block border-2 border-ink bg-offwhite px-5 py-3 hover:bg-paper">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink/50">
                SAKGELD
                <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
                <span className="ml-3 font-normal">DIE SYFERS WAT JOU BEURSIE RAAK</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
                {sakgeld.map((r) => (
                  <span key={r.sleutel} className="text-sm">
                    <span className="text-ink/60">{r.naam}:</span>{" "}
                    <span className="font-bold tabular-nums">
                      {r.eenheid === "R/l" ? `R ${Number(r.waarde).toFixed(2)}/l` : `${Number(r.waarde).toFixed(r.sleutel === "kpi" || r.sleutel === "ppi" ? 1 : 2)}%`}
                    </span>
                  </span>
                ))}
              </div>
            </Link>
          ) : null}

          {tab === "tuis" ? (
            <div className="mt-8">
              <MarkteTerminal aanvanklik={kwotasies} nuus={nuus} aanvangVraag={vra === "portefeulje" ? "Hoe lyk my portefeulje vandag — enige groot bewegings of nuus oor my aandele?" : null} />
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </>
  );
}
