import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { onvolledig } from "@/lib/wetlik";

/* Die gedeelde raamwerk vir die drie regsbladsye. Dit lees soos 'n dokument,
   eerder as die res van die webwerf: een kolom, met 'n leeswydte van ongeveer 68 karakters,
   en niks wat die leser se aandag van die teks aftrek nie.

   Die kolom se breedte word op die KINDERS toegepas, nie op die houer nie — 'n kleiner
   maksimumbreedte op die houer self sou, saam met mx-auto, die teks in die venster
   sentreer en dit teenoor die opskrif laat verskuif. */
export function WetlikeBlad({
  titel,
  opsomming,
  opgedateer,
  children,
}: {
  titel: string;
  opsomming: string;
  opgedateer: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar />
      <main className="flex-1">
        <div className="mx-auto max-w-[1180px] px-6 py-12 md:px-14 md:py-16">
          <div className="max-w-[68ch]">
            <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-red">Wetlik</p>
            <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight md:text-5xl">{titel}</h1>
            <p className="mt-5 text-[17px] text-ink/65">{opsomming}</p>
            <p className="mt-4 text-[13px] text-ink/50">Laas opgedateer: {opgedateer}</p>

            {onvolledig() ? (
              <p className="mt-8 border-l-[3px] border-red bg-offwhite px-4 py-3 text-[13px] text-ink/70">
                <strong className="font-bold text-ink">Nog nie klaar nie.</strong> Sommige van die besonderhede
                hieronder moet nog bevestig word en verskyn as <code>[[ NOG TE BEVESTIG ]]</code>. Hierdie bladsy
                is nog nie gereed om aan Paystack of aan &rsquo;n koper vertoon te word nie.
              </p>
            ) : null}

            {/* Die winkel loop VANDAG op Fourthwall, wat sy eie bestellings
                verwerk en aflewer. Sonder hierdie nota beloof die beleid hier
                onder 'n terugbetalingsproses wat Buitelyn nie self hanteer nie
                — en dít is presies die soort teenstrydigheid wat 'n
                betalingsverskaffer se nasiener raaksien. Haal die nota uit
                sodra die eie winkel oopmaak. */}
            <p className="mt-8 border border-ink/15 bg-offwhite px-4 py-3 text-[14px] leading-relaxed text-ink/75">
              Ons winkel is tans op{" "}
              <a
                href="https://buitelyn-shop.fourthwall.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                Fourthwall
              </a>
              . Bestellings wat jy daar plaas, word deur Fourthwall verwerk en afgelewer. Hulle eie voorwaardes en
              terugbetalingsproses geld vir daardie bestellings. Hierdie beleid geld vir aankope wat direk by
              buitelyn.com gemaak word. Ons bou tans ons eie winkel.
            </p>

            <div className="mt-10 space-y-10">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* Elke afdeling het sy eie opskrif. Die spasiëring word deur die ouer se
   space-y-10 beheer sodat afdelings nooit twee kantlyne op mekaar stapel nie. */
export function Afdeling({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-balance text-xl font-extrabold tracking-tight md:text-2xl">{titel}</h2>
      <div className="mt-3 space-y-3 text-[15.5px] leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}
