import type { Metadata } from "next";
import Link from "next/link";
import { WetlikeBlad, Afdeling, Wetsverwysing } from "@/components/wetlik/blad";
import { BESIGHEID, BELEID } from "@/lib/wetlik";

export const metadata: Metadata = {
  title: "Diensvoorwaardes | Buitelyn",
  description:
    "Die voorwaardes wat geld vir die gebruik van Buitelyn se webwerf, nuusbrief en winkel — wie ons is, hoe bestellings werk, en jou regte.",
  alternates: { canonical: "https://www.buitelyn.com/voorwaardes" },
};

export default function Voorwaardes() {
  return (
    <WetlikeBlad
      titel="Diensvoorwaardes"
      opsomming="Hierdie voorwaardes geld wanneer jy buitelyn.com gebruik, op die nuusbrief inteken of iets in die winkel koop."
      opgedateer="18 Augustus 2026"
    >
      <Afdeling titel="Wie ons is">
        <p>
          Buitelyn word bedryf deur {BESIGHEID.naam}{" "}(&ldquo;ons&rdquo;), &apos;n maatskappy wat in
          Suid-Afrika geregistreer is onder registrasienommer {BESIGHEID.registrasienommer}.
        </p>
        <p>
          Geregistreerde adres: {BESIGHEID.adres}
          <br />
          E-pos: {BESIGHEID.epos}
          <br />
          Telefoon: {BESIGHEID.telefoon}
        </p>
        <Wetsverwysing>
          Hierdie besonderhede word hier vermeld omdat artikel 43 van die Wet op Elektroniese Kommunikasie en Transaksies
          (ECTA) van &apos;n aanlyn verkoper vereis dat hy sy volle naam, regstatus, registrasienommer en fisiese adres
          bekend maak.
        </Wetsverwysing>
      </Afdeling>

      <Afdeling titel="Wat ons aanbied">
        <p>Ons aanbod bestaan uit drie dele, elk met sy eie reëls:</p>
        <p>
          <strong>Die webwerf en die nuusbrief</strong> is gratis. Jy mag dit lees, deel en met erkenning aanhaal. Ons
          kan nie waarborg dat dit altyd beskikbaar sal wees nie.
        </p>
        <p>
          <strong>Die winkel</strong> verkoop fisiese items wat ons aan jou stuur, digitale items wat jy aflaai of
          oopmaak, en maandelikse intekeninge. Elke soort het sy eie kansellasie- en terugbetalingsreëls —
          sien die <Link href="/kansellasie" className="font-semibold underline underline-offset-4">kansellasiebeleid</Link>{" "}
          en die <Link href="/terugbetalings" className="font-semibold underline underline-offset-4">terugbetalingsbeleid</Link>.
        </p>
        <p>
          <strong>Die markblaaie</strong> toon pryse en data van derde partye. Dit is inligting, nie finansiële
          advies nie, en dit kan verouderd of foutief wees.
        </p>
      </Afdeling>

      <Afdeling titel="Bestellings en pryse">
        <p>
          Alle pryse is in Suid-Afrikaanse rand en sluit BTW in, waar van toepassing. &apos;n Prys op die webwerf
          is &apos;n uitnodiging om te bestel, nie &apos;n aanbod nie: die koop kom eers tot stand sodra ons jou
          bestelling bevestig.
        </p>
        <p>
          Ons mag &apos;n bestelling weier of terugbetaal indien &apos;n item uit voorraad is, indien &apos;n prys duidelik
          verkeerd aangedui is, of indien ons die betaling nie kan verifieer nie. Indien dit ná betaling gebeur, sal jy die
          volle bedrag terugkry.
        </p>
        <p>Aflewering neem gewoonlik {BELEID.afleweringsDae}.</p>
      </Afdeling>

      <Afdeling titel="Betaling">
        <p>
          Betalings word deur Paystack verwerk. Jou kaartbesonderhede word direk aan hulle gestuur — ons sien dit nie en ons stoor dit
          ook nie. Ons hou slegs die bestelling self: wat jy gekoop het, die koste daarvan, en die afleweringsadres.
        </p>
      </Afdeling>

      <Afdeling titel="Jou regte as koper">
        <p>
          Niks hier neem enige regte weg wat die Verbruikerswet (CPA) of ECTA aan jou verleen nie. Indien hierdie
          voorwaardes met daardie wette bots, geniet die wet voorkeur.
        </p>
        <p>
          Kortweg: jy mag &apos;n aanlyn bestelling binne {BELEID.afkoelDae}{" "}dae ná ontvangs kanselleer sonder om
          &apos;n rede te verskaf, en jy het {BELEID.gebrekMaande}{" "}maande se beskerming vir &apos;n gebrekkige item.
          Die volledige besonderhede is op die ander twee bladsye beskikbaar.
        </p>
      </Afdeling>

      <Afdeling titel="Wat aan ons behoort">
        <p>
          Die naam Buitelyn, die logo, die video&apos;s, die nuusbrief en die redaksionele skryfwerk behoort aan ons.
          Jy mag &apos;n uittreksel aanhaal en daarna verwys; jy mag dit nie as jou eie herpubliseer of vir
          kommersiële doeleindes gebruik sonder ons skriftelike toestemming nie.
        </p>
        <p>
          Die nuusopskrifte wat ons van ander publikasies aanhaal, behoort aan húlle. Die werking hiervan word op die{" "}
          <Link href="/redaksioneel" className="font-semibold underline underline-offset-4">redaksionele blad</Link> uiteengesit.
        </p>
      </Afdeling>

      <Afdeling titel="Aanspreeklikheid">
        <p>
          Ons verrig ons werk sorgvuldig, maar ons aanvaar nie aanspreeklikheid vir verlies wat voortspruit uit &apos;n
          besluit wat jy geneem het op grond van inligting op hierdie webwerf nie — veral ten opsigte van die markdata.
          Vir enigiets wat jy by ons gekoop het, is ons aanspreeklikheid beperk tot die bedrag wat jy daarvoor betaal het.
        </p>
      </Afdeling>

      <Afdeling titel="Veranderinge">
        <p>
          Ons mag hierdie voorwaardes verander. Die datum bo-aan die blad dui aan wanneer dit laas gewysig is. &apos;n
          Verandering is nie terugwerkend van toepassing op &apos;n bestelling wat jy reeds geplaas het nie.
        </p>
      </Afdeling>

      <Afdeling titel="Reg en geskille">
        <p>
          Suid-Afrikaanse reg is van toepassing. Indien ons nie onderling tot &apos;n oplossing kan kom nie, kan jy die saak na die Nasionale
          Verbruikerskommissie of &apos;n verbruikershof verwys. Skryf eers aan {BESIGHEID.epos}{" "}— die meeste sake
          word met een e-pos opgelos.
        </p>
      </Afdeling>
    </WetlikeBlad>
  );
}
