import type { Metadata } from "next";
import { WetlikeBlad, Afdeling } from "@/components/wetlik/blad";
import { BESIGHEID, BELEID } from "@/lib/wetlik";

export const metadata: Metadata = {
  title: "Privaatheidsbeleid | Buitelyn",
  description:
    "Hoe Buitelyn se winkel jou besonderhede insamel, gebruik en beskerm onder die Wet op Beskerming van Persoonlike Inligting (POPIA).",
  alternates: { canonical: "https://www.buitelyn.com/privaatheid" },
};

export default function Privaatheid() {
  return (
    <WetlikeBlad
      titel="Privaatheidsbeleid"
      opsomming="Hierdie beleid verduidelik watter persoonlike inligting ons insamel wanneer jy in ons winkel koop, en wat ons daarmee doen."
      opgedateer="1 September 2026"
    >
      <Afdeling titel="Wat ons insamel">
        <p>
          Ons samel net persoonlike inligting in wanneer jy &apos;n bestelling in die winkel plaas: jou naam en
          van, kontakbesonderhede (e-pos en selfoonnommer), en jou afleweringsadres. Ons vra niks hiervan van &apos;n
          besoeker wat net rondkyk nie.
        </p>
      </Afdeling>

      <Afdeling titel="Hoekom ons dit insamel">
        <p>Ons gebruik daardie besonderhede vir drie doeleindes, en niks anders nie:</p>
        <p>
          <strong>Aflewering</strong> — sodat die koerier weet waarheen om jou item te stuur, en sodat ons jou kan
          kontak as daar &apos;n probleem met die aflewering is.
        </p>
        <p>
          <strong>Betalingsrekonsiliasie</strong> — sodat ons kan bevestig dat &apos;n betaling by Paystack met &apos;n
          bestelling ooreenstem.
        </p>
        <p>
          <strong>Belasting</strong> — ons moet verkooprekords vir belastingdoeleindes hou.
        </p>
      </Afdeling>

      <Afdeling titel="Hoe lank ons dit hou">
        <p>
          Ons hou bestellingrekords vir 5 jaar, soos deur belastingwetgewing vereis. Ná daardie tydperk word die
          rekord verwyder.
        </p>
      </Afdeling>

      <Afdeling titel="Met wie ons dit deel">
        <p>
          Ons deel jou besonderhede net met die twee partye wat dit nodig het om jou bestelling af te handel:{" "}
          <strong>Paystack</strong>, wat die betaling verwerk, en <strong>die koerier</strong>, wat die item aflewer.
          Ons verkoop, verhuur of ruil nooit jou persoonlike inligting met enige ander party nie.
        </p>
      </Afdeling>

      <Afdeling titel="Koekies">
        <p>
          Die winkel self gebruik geen koekies nie. Op <code>/markte</code>, waar jy kan aanmeld, gebruik ons &apos;n
          Supabase-sessiekoekie om jou aangemeld te hou. Dit dra geen bemarking- of nasporingskoekies nie.
        </p>
      </Afdeling>

      <Afdeling titel="Jou regte onder POPIA">
        <p>
          Onder die Wet op Beskerming van Persoonlike Inligting (POPIA) het jy die reg op insae in die inligting wat
          ons oor jou hou, die reg om &apos;n fout daarin reg te stel, en die reg om te vra dat dit uitgevee word
          (behalwe waar ons dit wettig moet hou, soos belastingrekords). Skryf na {BESIGHEID.epos}{" "}om enige van
          hierdie regte uit te oefen — ons antwoord binne redelike tyd.
        </p>
      </Afdeling>

      <Afdeling titel="Verantwoordelike party">
        <p>
          Die verantwoordelike party vir hierdie inligting is {BESIGHEID.naam}{" "}(&ldquo;ons&rdquo;), &apos;n
          maatskappy wat in Suid-Afrika geregistreer is onder registrasienommer {BESIGHEID.registrasienommer}.
        </p>
        <p>
          Geregistreerde adres: {BESIGHEID.adres}
          <br />
          E-pos: {BESIGHEID.epos}
          <br />
          Telefoon: {BESIGHEID.telefoon}
        </p>
        <p>Aflewering neem gewoonlik {BELEID.afleweringsDae}.</p>
      </Afdeling>
    </WetlikeBlad>
  );
}
