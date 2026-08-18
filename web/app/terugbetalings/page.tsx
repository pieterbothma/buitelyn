import type { Metadata } from "next";
import Link from "next/link";
import { WetlikeBlad, Afdeling, Wetsverwysing } from "@/components/wetlik/blad";
import { BESIGHEID, BELEID } from "@/lib/wetlik";

export const metadata: Metadata = {
  title: "Terugbetalingsbeleid | Buitelyn",
  description:
    "Wanneer Buitelyn geld terugbetaal, hoe lank dit neem, en wat van toepassing is op fisiese items, digitale items en intekeninge.",
  alternates: { canonical: "https://www.buitelyn.com/terugbetalings" },
};

export default function Terugbetalings() {
  return (
    <WetlikeBlad
      titel="Terugbetalingsbeleid"
      opsomming="Wanneer jy jou geld terugkry, hoe lank dit neem, en waarom die reëls verskil tussen items wat ons pos en dié wat jy aflaai."
      opgedateer="18 Augustus 2026"
    >
      <Afdeling titel="Die kort weergawe">
        <p>
          Vir items wat ons aan jou gepos het: jy het {BELEID.afkoelDae}{" "}dae ná ontvangs om van plan te verander, en{" "}
          {BELEID.gebrekMaande}{" "}maande as die item gebrekkig is. Vir items wat jy afgelaai of oopgemaak het, geld daardie
          afkoelreg nie meer nie, tensy dit nie werk soos belowe nie. Met &apos;n intekening kanselleer jy
          eerder as om &apos;n terugbetaling te vra — sien die{" "}
          <Link href="/kansellasie" className="font-semibold underline underline-offset-4">kansellasiebeleid</Link>.
        </p>
        <p>Terugbetalings word binne {BELEID.terugbetaalWerksdae}{" "}werksdae verwerk en word terugbetaal na dieselfde betaalmetode.</p>
      </Afdeling>

      <Afdeling titel="Fisiese items — jy het van plan verander">
        <p>
          Jy mag &apos;n bestelling binne {BELEID.afkoelDae}{" "}dae ná ontvangs terugstuur sonder om &apos;n rede te
          gee. Die item moet ongebruik wees, in die oorspronklike verpakking, en in &apos;n toestand waarin ons dit weer kan verkoop.
        </p>
        <p>Wie die terugstuurkoste dra: {BELEID.wieBetaalTerugstuur}.</p>
        <Wetsverwysing>
          Artikel 44 van ECTA gee &apos;n koper sewe dae ná ontvangs om &apos;n aanlyn bestelling te kanselleer,
          sonder rede en sonder boete, en bepaal dat die verkoper binne 30 dae moet terugbetaal. Ons betaal binne{" "}
          {BELEID.terugbetaalWerksdae}{" "}werksdae.
        </Wetsverwysing>
      </Afdeling>

      <Afdeling titel="Fisiese items — dit is gebreek, verkeerd of gebrekkig">
        <p>
          As jy die verkeerde item ontvang, of as iets binne {BELEID.gebrekMaande}{" "}maande gebrekkig raak, laat weet ons asseblief.
          Jy kies self of jy &apos;n herstel, vervanging of terugbetaling verkies. Ons dra die koste van die terugstuur — jy betaal niks.
        </p>
        <p>
          Dit geld nie vir normale slytasie nie, en ook nie vir skade wat ná aflewering ontstaan het nie.
        </p>
        <Wetsverwysing>
          Artikel 56 van die Verbruikerswet gee &apos;n koper ses maande om &apos;n gebrekkige item terug te gee, en
          die keuse tussen herstel, vervanging of terugbetaling lê by die koper, nie by die verkoper nie.
        </Wetsverwysing>
      </Afdeling>

      <Afdeling titel="Digitale items">
        <p>
          Sodra &apos;n digitale item afgelaai of oopgemaak is, kan ons dit nie terugneem nie, en die
          {" "}{BELEID.afkoelDae}-dae-afkoelreg geld nie meer daarvoor nie. As jy dit nog nie oopgemaak het nie, betaal
          ons dit volledig terug.
        </p>
        <p>
          As die item nie werk nie — byvoorbeeld, dit laai nie af nie, die lêer is beskadig, of dit stem nie ooreen met die beskrywing op die blad nie —
          sal jy jou geld terugkry, ongeag of dit oopgemaak is of nie.
        </p>
        <Wetsverwysing>
          Artikel 42(2) van ECTA sluit digitale inhoud wat reeds oopgemaak of afgelaai is, uit van die
          sewe-dae-afkoelreg. Dit ontneem jou egter nie jou reg op &apos;n item wat eenvoudig nie werk nie.
        </Wetsverwysing>
      </Afdeling>

      <Afdeling titel="Intekeninge">
        <p>
          Terugbetalings vir intekeninge word nie toegestaan deur &apos;n terugbetaling te vra nie — jy kanselleer dit, en dan hou die
          volgende afskrywing op. Die terugbetaling van die onbenutte deel van die huidige maand:{" "}
          {BELEID.intekeningProRata}.
        </p>
        <p>
          As ons jou per ongeluk gehef het nadat jy gekanselleer het, sal jy daardie bedrag ten volle terugkry — laat weet ons asseblief.
        </p>
      </Afdeling>

      <Afdeling titel="Hoe om aansoek te doen">
        <p>
          Stuur &apos;n e-pos na {BESIGHEID.epos}{" "}met jou bestellingnommer en &apos;n beskrywing van die probleem. &apos;n Foto is nuttig indien iets
          gebreek is. Ons sal jou antwoord en presies verduidelik wat die volgende stappe is.
        </p>
      </Afdeling>
    </WetlikeBlad>
  );
}
