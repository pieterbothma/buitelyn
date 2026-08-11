import { Footer } from "@/components/footer";
import { Koerantkop } from "@/components/tuisblad/koerantkop";
import { PrysStrook } from "@/components/tuisblad/prysstrook";
import { Dagoorsig } from "@/components/tuisblad/dagoorsig";
import { BewegersKort } from "@/components/tuisblad/bewegers-kort";
import { VanBuitelyn } from "@/components/tuisblad/van-buitelyn";
import { MarkNuus } from "@/components/tuisblad/marknuus";
import { Slot } from "@/components/tuisblad/slot";
import { getFeed, type Channel } from "@/lib/feed";
import { gekasdeOorsig, gekasdeSkuiwers, gekasdeNuus, gekasdeBordKwotasies } from "@/lib/markte-kas";
import { ALLE_SIMBOLE } from "@/lib/markets/boards";

/* Tuisblad — uitleg C: die markte is die voordeur, die skryfwerk staan langsaan.
   Die reël wat die hele blad orden: alles wat die cron reeds geskryf het is
   gratis en sigbaar. Net die goed wat per gebruiker loop — klets, portefeulje,
   waarskuwings, Telegram, Beursliga — sit agter die hek, en die hek wys wat
   daar is eerder as om dit weg te steek.

   Die ou tuisblad (Hero + Ticker + Voorblad) staan onaangeraak in components/;
   terugrol is 'n git-checkout van hierdie een lêer. */

export const revalidate = 300;

const SUBSTACK = "https://buitelyn.substack.com";

export default async function Home() {
  /* Alles hier is publiek en identies vir elke besoeker, dus loop dit deur
     dieselfde kas as /markte — ALLE_SIMBOLE tref presies die kas-inskrywing
     wat die Tuis-oortjie reeds warm hou, so die tuisblad kos niks ekstra
     stroomop nie. Die feed val apart uit sodat 'n stil Substack die markte
     nie saam met hom afvat nie. */
  const [kwotasies, oorsig, skuiwers, nuus, kanaal] = await Promise.all([
    gekasdeBordKwotasies(ALLE_SIMBOLE),
    gekasdeOorsig(),
    gekasdeSkuiwers(),
    gekasdeNuus(),
    getFeed().catch((): Channel => ({ tagline: "", posts: [] })),
  ]);

  return (
    <>
      <PrysStrook kwotasies={kwotasies} />
      <Koerantkop />
      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-14 md:py-12">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
            <div className="space-y-6">
              <Dagoorsig oorsig={oorsig} kwotasies={kwotasies} />
              <BewegersKort skuiwers={skuiwers} />
              <MarkNuus items={nuus} />
            </div>
            <div className="space-y-8">
              <VanBuitelyn posts={kanaal.posts} />
              <Slot />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Buitelyn — semi-sakenuus en iets van alles",
  description:
    "Die JSE, die rand en die dag se grootste bewegers — met die rede daaragter. Plus Buitelyn se skryfwerk.",
  alternates: { canonical: "https://www.buitelyn.com/" },
  openGraph: { url: SUBSTACK },
};
