import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { GIDSE, kryGids } from "@/lib/gidse";
import { INHOUD } from "@/content/gidse";
import { GidsInhoudBlok } from "@/components/gidse/gids-inhoud";
import { getQuotes } from "@/lib/markets/source";

/* Publieke SEO-blaaie: vooraf gebou, elke 15 min hergeldig (pas by die
   datavertraging), Google sien 'n volledige bediener-gerenderde blad. */
export const revalidate = 900;
/* Net die 8 gidse wat werklik inhoud het bestaan — enige ander slug is 'n 404,
   nie 'n stil regenerering nie. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GIDSE.filter((g) => INHOUD[g.slug]).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = kryGids(slug);
  const inhoud = g ? INHOUD[g.slug] : undefined;
  if (!g || !inhoud) return {};
  const titel = `${inhoud.titel} | Buitelyn`;
  return {
    title: titel,
    description: inhoud.beskrywing,
    alternates: {
      canonical: `https://www.buitelyn.com/gidse/${g.slug}`,
      languages: { af: `https://www.buitelyn.com/gidse/${g.slug}` },
    },
    openGraph: { title: titel, description: inhoud.beskrywing, type: "article" },
  };
}

/* Aparte diens-kliënt (nie service() uit /aandele nie): dié blad se enigste
   Supabase-bevraging is die dividendkalender en moet steeds werk — met 'n leë
   lys, nie 'n omvergooide bou nie — as die omgewingsveranderlikes ontbreek. */
function diensKliënt() {
  if (!process.env.APHQ_SUPABASE_URL || !process.env.APHQ_SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.APHQ_SUPABASE_URL, process.env.APHQ_SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

type DividendRy = { kode: string; maatskappy: string; bedrag_sent: number | null; ldt: string };

async function kryAankomendeDividende(): Promise<DividendRy[]> {
  const sb = diensKliënt();
  if (!sb) return [];
  const vandag = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  try {
    const { data, error } = await sb
      .from("dividend_kalender")
      .select("kode, maatskappy, bedrag_sent, ldt")
      .gte("ldt", vandag)
      .order("ldt", { ascending: true })
      .limit(5);
    if (error) return [];
    return data ?? [];
  } catch {
    /* Die blad moet volledig bly, al is die databasis onbereikbaar. */
    return [];
  }
}

export default async function GidsBlad({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gids = kryGids(slug);
  const inhoud = gids ? INHOUD[gids.slug] : undefined;
  if (!gids || !inhoud) notFound();

  /* Twee gidse dra live syfers — dis wat hulle beter maak as die statiese PDF
     wat tans eerste rangeer vir hierdie navrae. Albei val stil terug (geen
     blok) as die data ontbreek of die haal misluk. */
  const top40 = gids.slug === "wat-is-die-top-40" ? (await getQuotes(["STX40.JO"]))[0] ?? null : null;
  const dividende = gids.slug === "wat-is-n-dividend" ? await kryAankomendeDividende() : [];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: inhoud.titel,
      description: inhoud.beskrywing,
      inLanguage: "af",
      isAccessibleForFree: true,
      publisher: { "@type": "Organization", name: "Buitelyn", url: "https://www.buitelyn.com" },
      mainEntityOfPage: `https://www.buitelyn.com/gidse/${gids.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tuis", item: "https://www.buitelyn.com" },
        { "@type": "ListItem", position: 2, name: "Gidse", item: "https://www.buitelyn.com/gidse" },
        { "@type": "ListItem", position: 3, name: inhoud.titel },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TopBar />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-10 md:px-8">
          <nav className="text-xs text-ink/50">
            <Link href="/" className="hover:underline">Tuis</Link> ›{" "}
            <Link href="/gidse" className="hover:underline">Gidse</Link> › {inhoud.titel}
          </nav>

          <header className="mt-3 border-y-2 border-ink py-4">
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">{inhoud.titel}</h1>
          </header>

          {top40 ? (
            <p className="mt-5 border-2 border-ink bg-offwhite px-5 py-3 text-sm">
              <span className="text-ink/60">Die Top 40 staan tans op</span>{" "}
              <span className="font-bold tabular-nums">R {top40.prys.toFixed(2)}</span>{" "}
              <span className="text-ink/50">(Satrix 40, ±15 min vertraag)</span>
            </p>
          ) : null}

          {dividende.length ? (
            <section className="mt-5 border-2 border-ink bg-offwhite px-5 py-4">
              <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50">
                DIVIDENDE WAT NOU AANGEKONDIG IS
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {dividende.map((d) => (
                  <li key={`${d.kode}-${d.ldt}`} className="flex flex-wrap justify-between gap-x-4">
                    <span>
                      {d.maatskappy}{" "}
                      <span className="text-ink/50">({d.kode})</span>
                    </span>
                    <span className="tabular-nums">
                      {d.bedrag_sent != null ? (
                        <span className="font-bold">R {(Number(d.bedrag_sent) / 100).toFixed(2)}</span>
                      ) : null}{" "}
                      <span className="text-ink/50">LDT {d.ldt}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink/50">
                Uit werklike SENS-aankondigings op die JSE — nie &apos;n voorbeeld nie.
              </p>
            </section>
          ) : null}

          <GidsInhoudBlok inhoud={inhoud} gids={gids} />
        </article>
      </main>
      <Footer />
    </>
  );
}
