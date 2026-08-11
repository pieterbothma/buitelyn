import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { AandeelGrafiek } from "@/components/aandele/grafiek";
import { AANDELE, kryAandeel, tickerAlias } from "@/lib/aandele";
import { getQuotes, getSeries } from "@/lib/markets/source";
import { Pyl } from "@/components/markte/format";
import { MarktePromo } from "@/components/aandele/markte-promo";

/* Publieke SEO-blaaie: vooraf gebou, elke 15 min hergeldig (pas by die
   datavertraging), Google sien 'n volledige bediener-gerenderde blad. */
export const revalidate = 900;
/* dynamicParams bly aan sodat ou ticker-slugs (bv. /aandele/sol) permanent
   na die naam-slug kan herlei in plaas van 404. */
export const dynamicParams = true;

export function generateStaticParams() {
  return AANDELE.map((a) => ({ kode: a.slug }));
}

/* Sonder ap-hq se sleutels moet hierdie blad stééds bou: die prys en die
   grafiek kom van Yahoo af, en net die Supabase-ekstras (profiel, SENS,
   dividende, skuiwer-nota, nuus) val weg.

   Die twee `!`-bewerings het gelyk soos 'n formaliteit, maar generateStaticParams
   laat elke aandeel by BOUTYD voorafrender, en daar gooi createClient
   "supabaseUrl is required" as die veranderlike ontbreek. Die twee sleutels
   is net op Production gestel, dus het die heel eerste voorskou-ontplooiing
   gesterf op /aandele/naspers — 'n blad wat niemand verander het nie. */
function service(): SupabaseClient | null {
  const url = process.env.APHQ_SUPABASE_URL;
  const sleutel = process.env.APHQ_SUPABASE_SERVICE_KEY;
  if (!url || !sleutel) return null;
  return createClient(url, sleutel, { auth: { persistSession: false } });
}

export async function generateMetadata({ params }: { params: Promise<{ kode: string }> }): Promise<Metadata> {
  const { kode } = await params;
  const a = kryAandeel(kode);
  if (!a) return {};
  const kort = a.simbool.replace(".JO", "");
  const titel = `${a.naam} (${kort}) Aandeelprys en Grafiek${a.land === "za" ? " – JSE" : ""} | Buitelyn`;
  const beskrywing = `Die ${a.naam}-aandeelprys vandag (±15 min vertraag), grafiek oor tyd, maatskappyprofiel${a.land === "za" ? ", SENS-aankondigings" : ""} en dividende — alles in Afrikaans op Buitelyn.`;
  return {
    title: titel,
    description: beskrywing,
    alternates: { canonical: `https://www.buitelyn.com/aandele/${a.slug}`, languages: { af: `https://www.buitelyn.com/aandele/${a.slug}` } },
    openGraph: { title: titel, description: beskrywing },
  };
}

const fmtDatum = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "long", year: "numeric" });

export default async function AandeelBlad({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  let a = kryAandeel(kode);
  if (!a) {
    const alias = tickerAlias(kode);
    if (alias) permanentRedirect(`/aandele/${alias.slug}`);
    notFound();
  }
  a = a!;
  const kort = a.simbool.replace(".JO", "");
  const sb = service();

  const jseKode = a.land === "za" ? kort : null;
  const [kwotasies, reeks, { data: profiel }, { data: sens }, { data: dividende }, { data: nota }, { data: nuus }] = await Promise.all([
    getQuotes([a.simbool]),
    getSeries(a.simbool, "1y"),
    sb ? sb.from("aandeel_profiele").select("profiel_teks").eq("slug", a.slug).maybeSingle() : Promise.resolve({ data: null }),
    sb && jseKode
      ? sb.from("sens_aankondigings").select("sens_id, tyd, titel, tipe, opsomming, skakel").eq("kode", jseKode).order("tyd", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    sb && jseKode
      ? sb.from("dividend_kalender").select("bedrag_sent, ldt, betaaldatum").eq("kode", jseKode).order("ldt", { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    sb ? sb.from("skuiwer_notas").select("nota, datum").eq("simbool", a.simbool).order("datum", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    sb
      ? sb
          .from("markte_nuus")
          .select("titel_af, opsomming, bron, skakel, gepubliseer")
          .or(`titel_af.ilike.%${a.naam.split(" ")[0]}%,opsomming.ilike.%${a.naam.split(" ")[0]}%`)
          .order("gepubliseer", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
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
                ["52-WEEK HOOGTEPUNT", `${geld} ${hoog52.toFixed(2)}`],
                ["52-WEEK LAAGTEPUNT", `${geld} ${laag52.toFixed(2)}`],
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

          {/* profiel */}
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

          {/* in die nuus */}
          {nuus?.length ? (
            <section className="mt-8">
              <h2 className="text-xl font-extrabold tracking-tight">In die nuus</h2>
              <ul className="mt-2 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
                {nuus.map((n) => (
                  <li key={n.skakel} className="px-4 py-2.5">
                    <p className="text-xs tracking-[0.1em] text-ink/40">
                      {n.bron.toUpperCase()} · {fmtDatum.format(new Date(n.gepubliseer))}
                    </p>
                    <a href={n.skakel} target="_blank" rel="noreferrer" className="mt-0.5 block text-sm font-bold leading-snug underline-offset-4 hover:underline">
                      {n.titel_af}
                    </a>
                    {n.opsomming ? <p className="mt-0.5 text-sm leading-snug text-ink/70">{n.opsomming}</p> : null}
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

          <MarktePromo />

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
