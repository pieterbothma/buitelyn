import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { AANDELE } from "@/lib/aandele";
import { getQuotes } from "@/lib/markets/source";
import { Pyl } from "@/components/markte/format";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "JSE Aandeelpryse in Afrikaans — alle groot aandele | Buitelyn",
  description:
    "Aandeelpryse, grafieke en maatskappyprofiele vir die JSE se grootste aandele — Naspers, Sasol, Capitec en meer — plus die VSA-megacaps. Alles in Afrikaans, ±15 min vertraag.",
  alternates: { canonical: "https://www.buitelyn.com/aandele" },
};

export default async function AandeleIndeks() {
  const kwotasies = await getQuotes(AANDELE.map((a) => a.simbool));
  const kaart = new Map(kwotasies.map((k) => [k.simbool, k]));
  const jse = AANDELE.filter((a) => a.land === "za");
  const vsa = AANDELE.filter((a) => a.land === "vsa");

  const Lys = ({ titel, items }: { titel: string; items: typeof AANDELE }) => (
    <section className="mt-8">
      <h2 className="text-xl font-extrabold tracking-tight">{titel}</h2>
      <ul className="mt-3 grid gap-px overflow-hidden border-2 border-ink bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => {
          const k = kaart.get(a.simbool);
          const geld = k?.geldeenheid === "ZAR" ? "R" : k?.geldeenheid === "USD" ? "$" : "";
          return (
            <li key={a.slug} className="bg-offwhite">
              <Link href={`/aandele/${a.slug}`} className="flex items-baseline gap-2 px-4 py-2.5 hover:bg-paper">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.naam}</span>
                {k ? (
                  <>
                    <span className="text-sm tabular-nums text-ink/70">
                      {geld} {k.prys.toFixed(2)}
                    </span>
                    {k.deltaPersent != null ? (
                      <span className={`flex w-16 items-center justify-end gap-1 text-xs font-bold tabular-nums ${k.deltaPersent >= 0 ? "text-green" : "text-red"}`}>
                        <Pyl op={k.deltaPersent >= 0} />
                        {Math.abs(k.deltaPersent).toFixed(1)}%
                      </span>
                    ) : null}
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <>
      <TopBar />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-10 md:px-8">
          <div className="border-y-2 border-ink">
            <div className="my-1 border-y border-ink py-3">
              <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">Aandele</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/70">
            Aandeelpryse, grafieke, maatskappyprofiele en SENS-aankondigings — alles in
            Afrikaans. Pryse is ±15 minute vertraag. Wil jy jou eie portefeulje volg?{" "}
            <Link href="/markte" className="font-semibold underline underline-offset-2 hover:text-red">
              Maak gratis 'n rekening oop by Markte →
            </Link>
          </p>
          <Lys titel="JSE — Johannesburgse Aandelebeurs" items={jse} />
          <Lys titel="VSA — die megacaps" items={vsa} />
        </section>
      </main>
      <Footer />
    </>
  );
}
