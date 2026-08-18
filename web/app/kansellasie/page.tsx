import type { Metadata } from "next";
import Link from "next/link";
import { WetlikeBlad, Afdeling, Wetsverwysing } from "@/components/wetlik/blad";
import { BESIGHEID, BELEID } from "@/lib/wetlik";

export const metadata: Metadata = {
  title: "Kansellasiebeleid | Buitelyn",
  description:
    "Hoe om 'n Buitelyn-bestelling of -intekening te kanselleer, wanneer dit geld, en wat die koste is.",
  alternates: { canonical: "https://www.buitelyn.com/kansellasie" },
};

export default function Kansellasie() {
  return (
    <WetlikeBlad
      titel="Kansellasiebeleid"
      opsomming="Hoe jy 'n bestelling of intekening kanselleer, wanneer dit geld, en wat die koste is."
      opgedateer="18 Augustus 2026"
    >
      <Afdeling titel="Bestellings wat nog nie versend is nie">
        <p>
          Laat weet ons voordat die pakkie versend word, en ons kanselleer dit gratis en betaal die volle bedrag terug. Stuur &rsquo;n e-pos na {BESIGHEID.epos}{" "}met jou bestellingnommer — hoe gouer, hoe makliker die proses.
        </p>
      </Afdeling>

      <Afdeling titel="Reeds ontvangde bestellings">
        <p>
          Jy het {BELEID.afkoelDae}{" "}dae ná ontvangs om te kanselleer, sonder om &rsquo;n rede te verskaf. Stuur die item
          ongebruik terug en ons betaal jou terug binne {BELEID.terugbetaalWerksdae}{" "}werksdae. Die koste vir die terugstuur: {BELEID.wieBetaalTerugstuur}.
        </p>
        <Wetsverwysing>
          Artikel 44 van ECTA. Hierdie reg is &rsquo;n minimum wat die wet verleen — ons kan dit nie wegneem of daaraan &rsquo;n
          boete koppel nie.
        </Wetsverwysing>
      </Afdeling>

      <Afdeling titel="Digitale items">
        <p>
          Indien jy dit reeds afgelaai of oopgemaak het, kan dit nie gekanselleer word nie. Indien jy dit nog nie gedoen het nie, kanselleer
          ons dit en betaal die volle bedrag terug. As dit glad nie werk nie, kwalifiseer dit vir &rsquo;n terugbetaling en nie &rsquo;n
          kansellasie nie — sien die{" "}
          <Link href="/terugbetalings" className="font-semibold underline underline-offset-4">terugbetalingsbeleid</Link>.
        </p>
      </Afdeling>

      <Afdeling titel="Intekeninge">
        <p>
          Jy kan enige tyd kanselleer, sonder om &rsquo;n rede te verskaf en sonder &rsquo;n boete. Die kansellasie word van krag
          aan die einde van die tydperk waarvoor jy reeds betaal het — jy behou dus toegang tot dan. Die
          terugbetaling van die onbenutte deel: {BELEID.intekeningProRata}.
        </p>
        <p>
          Indien jou intekening &rsquo;n vaste termyn het, kan jy dit met 20 werksdae se skriftelike kennis beëindig. Ons mag &rsquo;n
          redelike bedrag hef vir dienste wat reeds gelewer is, maar nie &rsquo;n boete wat as straf dien nie.
        </p>
        <Wetsverwysing>
          Artikel 14 van die Verbruikerswet: &rsquo;n verbruiker mag &rsquo;n vaste-termyn-ooreenkoms met 20 werksdae
          se skriftelike kennis kanselleer, en die verkoper mag slegs &rsquo;n redelike kansellasiefooi hef.
        </Wetsverwysing>
      </Afdeling>

      <Afdeling titel="Wanneer ons kanselleer">
        <p>
          Ons kanselleer &rsquo;n bestelling slegs indien die item uit voorraad is, indien die prys duidelik verkeerd vertoon
          is, of indien ons die betaling nie kan verifieer nie. Dan ontvang jy die volle bedrag terug en ons verskaf &rsquo;n rede.
        </p>
      </Afdeling>

      <Afdeling titel="Hoe om te kanselleer">
        <p>
          &rsquo;n Enkele e-pos aan {BESIGHEID.epos}{" "}met jou bestelling- of intekeningnommer is voldoende. Jy hoef nie &rsquo;n rede
          te verskaf nie. Ons bevestig skriftelik en lig jou in wanneer dit van krag word.
        </p>
      </Afdeling>
    </WetlikeBlad>
  );
}
