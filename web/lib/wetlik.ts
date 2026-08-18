/* Die feite wat op al drie die wetlike bladsye moet verskyn.

   ECTA artikel 43 vereis dat 'n aanlyn verkoper sy volle naam, regstatus,
   registrasienommer, fisiese adres en kontakbesonderhede wys. Paystack se
   nasienspan kyk presies daarna. Alles staan hier op één plek sodat 'n
   verandering aan die adres nie drie bladsye moet raakloop nie.

   ONBEVESTIG merk 'n feit wat NIEMAND nog bevestig het nie. Dit is doelbewus
   lelik en doelbewus greppable: `npm run wetlik-hek` sak as een van hulle nog
   in die bou beland. Ons raai nie 'n registrasienommer of 'n adres nie — 'n
   verkeerde een op 'n wetlike bladsy is erger as 'n oop hakie. */
export const ONBEVESTIG = "[[ NOG TE BEVESTIG ]]";

export const BESIGHEID = {
  /* Die GEREGISTREERDE naam, nie die handelsnaam nie. ECTA art. 43 vra die
     regspersoon se volle naam en registrasienommer — 'n handelsnaam alleen
     voldoen nie, en 'n koper wat moet kla, moet weet wie hy dagvaar. */
  /* Presies soos geregistreer — NIE vertaal nie. "(Edms) Bpk" is die
     Afrikaanse vorm van "(Pty) Ltd", maar dit is 'n ANDER string, en Paystack
     vergelyk hierdie naam karakter vir karakter met die CIPC-dokument.
     Piet moet dit teen die sertifikaat nagaan (hoofletters ingesluit). */
  naam: "Promenader (Pty) Ltd",
  registrasienommer: "2026/320074/07",
  /* Waaronder die publiek ons ken. Seepunt Media is die handelsnaam op die
     Paystack-rekening; Buitelyn is die publikasie self. */
  handelsnaam: "Seepunt Media",
  publikasie: "Buitelyn",
  adres: "6 Bellevue Road, Cape Town 8050",
  epos: "apduplessis@gmail.com",
  telefoon: "062 707 0784",
} as const;

/* Wat die winkel verkoop. Elke soort dra sy eie kansellasiereëls, want die
   wet behandel hulle nie dieselfde nie — sien die kommentaar by ELKE reël. */
export const BELEID = {
  /* ECTA art. 44: die koper mag binne 7 dae ná ontvangs kanselleer, sonder
     rede en sonder boete. Dit is 'n wetlike minimum, nie 'n keuse nie. */
  afkoelDae: 7,

  /* ECTA art. 44(2): die terugbetaling moet binne 30 dae ná die kansellasie
     wees. Ons sê 10 werksdae — vinniger as die wet, en haalbaar. */
  terugbetaalWerksdae: 10,

  /* CPA art. 56: ses maande op 'n gebrekkige item — herstel, vervang of
     terugbetaal, en die koper kies. */
  gebrekMaande: 6,

  /* ECTA art. 44(1)(b): die koper mag die direkte koste van teruglewering
     dra. Piet se keuse (2026-08-18): die koper. Dit geld NET wanneer iemand
     van plan verander — 'n gebrekkige item kom altyd op ons koste terug. */
  wieBetaalTerugstuur: "die koper",

  /* Hoe lank aflewering neem. Nodig vir die beleid én vir Paystack. */
  afleweringsDae: "5 tot 7 werksdae",

  /* Word 'n intekening se onbenutte deel terugbetaal wanneer iemand halfpad
     deur die maand kanselleer, of loop dit klaar tot die einde van die
     betaalde tydperk? Albei is wettig; dit is Buitelyn se keuse. */
  intekeningProRata: ONBEVESTIG,
} as const;

/* Waar of nie: is daar nog 'n onbevestigde feit oor? Die bladsye gebruik dit
   om 'n sigbare waarskuwing te wys eerder as om stilweg 'n gat te los. */
export function onvolledig(): boolean {
  return [...Object.values(BESIGHEID), ...Object.values(BELEID)].some((v) => v === ONBEVESTIG);
}
