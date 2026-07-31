import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { GIDSE } from "@/lib/gidse";
import { INHOUD } from "@/content/gidse";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Gidse — beleggingsbegrippe in Afrikaans | Buitelyn",
  description:
    "Rustige Afrikaanse verduidelikings van hoe die JSE, dividende, ETF's en makelaars werk — sonder jargon en sonder advies.",
  alternates: { canonical: "https://www.buitelyn.com/gidse" },
};

export default function GidseIndeks() {
  const beskikbaar = GIDSE.filter((g) => INHOUD[g.slug]);
  const groepe = [
    { sleutel: "beginner" as const, naam: "OM TE BEGIN" },
    { sleutel: "konsep" as const, naam: "BEGRIPPE" },
  ];

  return (
    <>
      <TopBar />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-10 md:px-8">
          <div className="border-y-2 border-ink">
            <div className="my-1 border-y border-ink py-3">
              <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Gidse</h1>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink/70">
            Hoe die JSE, dividende en makelaars werk — in gewone Afrikaans, sonder jargon.
          </p>

          {groepe.map((groep) => (
            <div key={groep.sleutel} className="mt-9">
              <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50">{groep.naam}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {beskikbaar
                  .filter((g) => g.groep === groep.sleutel)
                  .map((g) => (
                    <Link
                      key={g.slug}
                      href={`/gidse/${g.slug}`}
                      className="group border-2 border-ink bg-offwhite p-5 hover:bg-paper"
                    >
                      <h3 className="text-lg font-extrabold tracking-tight group-hover:underline">
                        {INHOUD[g.slug].titel} &rarr;
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink/60">
                        {INHOUD[g.slug].beskrywing}
                      </p>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
