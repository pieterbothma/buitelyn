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
          {/* Twee kolomme op groot skerms, een stapel op 'n foon — maar nie
              dieselfde volgorde nie. 'n Gestapelde raster loop kolom vir
              kolom af, so op 'n foon het die hele markte-kant (oorsig,
              bewegers, marknuus) voor die eerste storie gekom en Van
              Buitelyn het ver onder marknuus beland.

              Die kolom-houers word daarom `display:contents` op 'n foon:
              hulle verdwyn as bokse en hul kinders word self raster-items,
              wat beteken order-* kan die vyf blokke onafhanklik rangskik.
              Op lg word hulle weer gewone blokke en elke kolom vloei op sy
              eie — wat 'n mens NIE met eksplisiete grid-rye kan doen nie,
              want dan deel die twee kolomme hul ryhoogtes en 'n kort
              oorsig kry 'n gat onder hom tot by die lang storie-kolom.

              Die houers is kaal divs, dus is dit die veilige geval vir
              display:contents — daar is geen semantiek om uit die
              toeganklikheidsboom te verloor nie. */}
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-12">
            <div className="contents lg:block lg:space-y-6">
              <div className="order-1">
                <Dagoorsig oorsig={oorsig} kwotasies={kwotasies} />
              </div>
              <div className="order-2">
                <BewegersKort skuiwers={skuiwers} />
              </div>
              <div className="order-4">
                <MarkNuus items={nuus} />
              </div>
            </div>
            <div className="contents lg:block lg:space-y-8">
              <div className="order-3">
                <VanBuitelyn posts={kanaal.posts} />
              </div>
              <div className="order-5">
                <Slot />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

const TUIS = "https://www.buitelyn.com/";
const BESKRYWING =
  "Die JSE, die rand en die dag se grootste bewegers — met die rede daaragter. Plus Buitelyn se skryfwerk.";

/* og:url wys na die WERF, nie na Substack nie. Dit het eers na Substack
   gewys, wat beteken het dat elke keer as iemand buitelyn.com op WhatsApp
   deel, die voorskou Substack adverteer — presies die teenoorgestelde van
   die plan om die gehoor hierheen te trek. */
export const metadata = {
  title: "Buitelyn — semi-sakenuus en iets van alles",
  description: BESKRYWING,
  alternates: { canonical: TUIS },
  openGraph: {
    type: "website",
    url: TUIS,
    siteName: "Buitelyn",
    locale: "af_ZA",
    title: "Buitelyn — semi-sakenuus en iets van alles",
    description: BESKRYWING,
  },
};
