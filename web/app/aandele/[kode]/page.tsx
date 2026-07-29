import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { AandeelGrafiek } from "@/components/aandele/grafiek";
import { AANDELE, kryAandeel } from "@/lib/aandele";
import { getQuotes, getSeries } from "@/lib/markets/source";
import { Pyl } from "@/components/markte/format";

/* Publieke SEO-blaaie: vooraf gebou, elke 15 min hergeldig (pas by die
   datavertraging), Google sien 'n volledige bediener-gerenderde blad. */
export const revalidate = 900;
export const dynamicParams = false;

export function generateStaticParams() {
  return AANDELE.map((a) => ({ kode: a.slug }));
}

function service() {
  return createClient(process.env.APHQ_SUPABASE_URL!, process.env.APHQ_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ kode: string }> }): Promise<Metadata> {
  const { kode } = await params;
  const a = kryAandeel(kode);
  if (!a) return {};
  const kort = a.simbool.replace(".JO", "");
  const { data: profiel } = await service().from("aandeel_profiele").select("beeld_url").eq("slug", a.slug).maybeSingle();
  const titel = `${a.naam} (${kort}) Aandeelprys en Grafiek${a.land === "za" ? " – JSE" : ""} | Buitelyn`;
  const beskrywing = `Die ${a.naam}-aandeelprys vandag (±15 min vertraag), grafiek oor tyd, maatskappyprofiel${a.land === "za" ? ", SENS-aankondigings" : ""} en dividende — alles in Afrikaans op Buitelyn.`;
  return {
    title: titel,
    description: beskrywing,
    alternates: { canonical: `https://www.buitelyn.com/aandele/${a.slug}`, languages: { af: `https://www.buitelyn.com/aandele/${a.slug}` } },
    openGraph: {
      title: titel,
      description: beskrywing,
      ...(profiel?.beeld_url ? { images: [{ url: profiel.beeld_url }] } : {}),
    },
  };
}

const fmtDatum = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "long", year: "numeric" });

export default async function AandeelBlad({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const a = kryAandeel(kode);
  if (!a) notFound();
  const kort = a.simbool.replace(".JO", "");
  const sb = service();

  const jseKode = a.land === "za" ? kort : null;
  const [kwotasies, reeks, { data: profiel }, { data: sens }, { data: dividende }, { data: nota }] = await Promise.all([
    getQuotes([a.simbool]),
    getSeries(a.simbool, "1y"),
    sb.from("aandeel_profiele").select("profiel_teks, beeld_url").eq("slug", a.slug).maybeSingle(),
    jseKode
      ? sb.from("sens_aankondigings").select("sens_id, tyd, titel, tipe, opsomming, skakel").eq("kode", jseKode).order("tyd", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    jseKode
      ? sb.from("dividend_kalender").select("bedrag_sent, ldt, betaaldatum").eq("kode", jseKode).order("ldt", { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    sb.from("skuiwer_notas").select("nota, datum").eq("simbool", a.simbool).order("datum", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const k = kwotasies[0];
  const geld = k?.geldeenheid === "ZAR" ? "R" : k?.geldeenheid === "USD" ? "$" : (k?.geldeenheid ?? "");
  const hoog52 = reeks.length ? Math.max(...reeks.map((r) => r.p)) : null;
  const laag52 = reeks.length ? Math.min(...reeks.map((r) => r.p)) : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Corporation",
      name: a.naam,
      tickerSymbol: kort,
      ...(a.land === "za" ? { location: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "ZA" } } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${a.naam} (${kort}) Aandeelprys en Oorsig`,
      inLanguage: "af",
      dateModified: new Date().toISOString(),
      url: `https://www.buitelyn.com/aandele/${a.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tuis", item: "https://www.buitelyn.com" },
        { "@type": "ListItem", position: 2, name: "Aandele", item: "https://www.buitelyn.com/aandele" },
        { "@type": "ListItem", position: 3, name: a.naam, item: `https://www.buitelyn.com/aandele/${a.slug}` },
      ],
    },
  ];

  const GEREEDSKAP = [
    { naam: "Jou portefeulje, live in rand", wat: "Volg jou aandele (ook oorsese) met waarde-oor-tyd-grafieke, toewysing en wins/verlies — alles outomaties in rand omgereken." },
    { naam: "Grootste Bewegers met 'n rede", wat: "Elke groot JSE-skuif kry 'n KI-nota wat sê hóékom — gegrond op regte nuus, nie raaiwerk nie." },
    { naam: "SENS in Afrikaans", wat: "Elke JSE-aankondiging in een verstaanbare Afrikaanse sin, met jou eie aandele gemerk." },
    { naam: "Die Beursliga", wat: "R100 000 denkbeeldige geld, net JSE-aandele, maandelikse ranglys — kry jou blywende lidnommer." },
    { naam: "Telegram-klankgrepe en waarskuwings", wat: "Drie markte-oorsigte per dag as klank, pryswaarskuwings, dividend-herinneringe en 'n slim bot wat jou vrae antwoord." },
    { naam: "Sakgeld-sakrekenaars", wat: "Verband, petrol, inflasie en spaargroei — voorafgelaai met vandag se amptelike koerse." },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />
      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-6 py-10 md:px-8">
          <nav className="text-xs text-ink/50">
            <Link href="/" className="hover:underline">Tuis</Link> ›{" "}
            <Link href="/aandele" className="hover:underline">Aandele</Link> › {a.naam}
          </nav>

          {/* kop: naam + prys */}
          <header className="mt-3 border-y-2 border-ink py-4">
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">
              {a.naam} <span className="text-xl font-bold text-ink/50">({kort})</span>
            </h1>
            {k ? (
              <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-3xl font-extrabold tabular-nums">
                  {geld} {k.prys.toFixed(2)}
                </span>
                {k.deltaPersent != null ? (
                  <span className={`flex items-center gap-1.5 text-lg font-bold tabular-nums ${k.deltaPersent >= 0 ? "text-green" : "text-red"}`}>
                    <Pyl op={k.deltaPersent >= 0} />
                    {k.deltaPersent >= 0 ? "+" : ""}
                    {k.deltaPersent.toFixed(2)}%
                  </span>
                ) : null}
                <span className="text-xs tracking-[0.12em] text-ink/50">
                  {a.land === "za" ? "JSE" : "VSA"} · ±15 MIN VERTRAAG
                </span>
              </p>
            ) : null}
          </header>

          {/* grafiek */}
          <section className="mt-6 border-2 border-ink bg-offwhite p-4">
            <AandeelGrafiek simbool={a.simbool} aanvanklik={reeks} />
          </section>

          {/* sleutelstatistieke */}
          {k && hoog52 != null && laag52 != null ? (
            <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["PRYS NOU", `${geld} ${k.prys.toFixed(2)}`],
                ["VANDAG", k.deltaPersent != null ? `${k.deltaPersent >= 0 ? "+" : ""}${k.deltaPersent.toFixed(2)}%` : "—"],
                ["52-WEEK HOOG", `${geld} ${hoog52.toFixed(2)}`],
                ["52-WEEK LAAG", `${geld} ${laag52.toFixed(2)}`],
              ].map(([n, v]) => (
                <div key={n} className="border-2 border-ink bg-offwhite px-3 py-2">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-ink/50">{n}</p>
                  <p className="text-lg font-extrabold tabular-nums">{v}</p>
                </div>
              ))}
            </section>
          ) : null}

          {nota?.nota ? (
            <p className="mt-4 border-2 border-ink bg-paper px-4 py-3 text-sm leading-relaxed">
              <span className="font-bold">Onlangse beweging:</span> {nota.nota}
            </p>
          ) : null}

          {/* profiel + beeld */}
          {profiel?.beeld_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profiel.beeld_url} alt={`Illustrasie van ${a.naam} se besigheid`} className="mt-6 w-full border-2 border-ink" />
          ) : null}
          {profiel?.profiel_teks ? (
            <section className="mt-6">
              <h2 className="text-xl font-extrabold tracking-tight">Oor {a.naam}</h2>
              <div className="mt-2 max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink/85">
                {profiel.profiel_teks.split(/\n\n+/).map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {/* dividende */}
          {dividende?.length ? (
            <section className="mt-8">
              <h2 className="text-xl font-extrabold tracking-tight">Dividende</h2>
              <ul className="mt-2 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
                {dividende.map((d, i) => (
                  <li key={i} className="flex flex-wrap gap-x-4 px-4 py-2 text-sm tabular-nums">
                    {d.bedrag_sent ? <span className="font-bold">{Number(d.bedrag_sent) >= 100 ? `R ${(Number(d.bedrag_sent) / 100).toFixed(2)}` : `${Number(d.bedrag_sent).toFixed(0)}c`} per aandeel</span> : null}
                    {d.ldt ? <span className="text-ink/70">LDT {fmtDatum.format(new Date(`${d.ldt}T12:00:00Z`))}</span> : null}
                    {d.betaaldatum ? <span className="text-ink/70">betaal {fmtDatum.format(new Date(`${d.betaaldatum}T12:00:00Z`))}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* SENS */}
          {sens?.length ? (
            <section className="mt-8">
              <h2 className="text-xl font-extrabold tracking-tight">Jongste SENS-aankondigings</h2>
              <ul className="mt-2 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
                {sens.map((s) => (
                  <li key={s.sens_id} className="px-4 py-2.5">
                    <p className="text-xs tabular-nums text-ink/40">
                      {fmtDatum.format(new Date(s.tyd))} · {s.tipe.toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-ink/80">
                      {s.opsomming ?? s.titel}{" "}
                      <a href={s.skakel} target="_blank" rel="noreferrer" className="whitespace-nowrap text-ink/40 underline underline-offset-2 hover:text-red">
                        skakel →
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* verwante aandele */}
          <section className="mt-8">
            <h2 className="text-xl font-extrabold tracking-tight">Ander aandele</h2>
            <p className="mt-2 flex flex-wrap gap-2">
              {verwante(a.slug).map((v) => (
                <Link key={v.slug} href={`/aandele/${v.slug}`} className="border-2 border-ink bg-offwhite px-3 py-1.5 text-sm font-semibold hover:bg-ink hover:text-offwhite">
                  {v.naam}
                </Link>
              ))}
            </p>
          </section>

          {/* markte-promo */}
          <section className="mt-10 border-2 border-ink bg-offwhite">
            <h2 className="border-b-2 border-ink px-5 py-3 text-sm font-extrabold tracking-[0.1em]">
              MEER OP BUITELYN MARKTE
              <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
            </h2>
            <div className="grid gap-x-6 gap-y-4 px-5 py-4 md:grid-cols-2">
              {GEREEDSKAP.map((g) => (
                <div key={g.naam}>
                  <p className="text-sm font-bold">{g.naam}</p>
                  <p className="mt-0.5 text-sm leading-snug text-ink/70">{g.wat}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-ink/15 px-5 py-4">
              <Link href="/markte" className="inline-block border-2 border-ink bg-ink px-5 py-2.5 text-sm font-bold text-offwhite hover:border-red hover:bg-red">
                Maak gratis 'n Buitelyn-rekening oop →
              </Link>
              <span className="ml-3 text-xs text-ink/50">Gratis — net 'n e-posadres nodig.</span>
            </div>
          </section>

          <p className="mt-6 text-xs leading-relaxed text-ink/50">
            Pryse ±15 minute vertraag. Buitelyn gee inligting en konteks, nie finansiële advies
            nie. Laas bygewerk {fmtDatum.format(new Date())}.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}

/** Ses bure vir interne skakels — stabiel per blad (alfabet-roterend). */
function verwante(slug: string) {
  const i = AANDELE.findIndex((a) => a.slug === slug);
  return Array.from({ length: 6 }, (_, n) => AANDELE[(i + n + 1) % AANDELE.length]);
}
