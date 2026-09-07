/* Meme: vollebleed-foto met Anton-hoofletters bo en onder. BEDIENER-ALLEEN.

   LISENSIE — lees dit voor jy sjablone byvoeg. Bykans elke klassieke
   meme-sjabloon is 'n raampie uit 'n rolprent of 'n gelisensieerde foto, en
   GEEN meme-API waarborg daardie beelde nie (Imgflip se voorwaardes ontken dit
   uitdruklik). Suid-Afrika het ook geen breë fair use of parodie-uitsondering
   nie — artikel 12 se fair dealing is nou en vereis erkenning. Vir 'n
   kommersiële blad is die veilige pad dus: Buitelyn se EIE foto's, of
   geverifieerde CC0. Daarom vat hierdie styl 'n beeld uit ons eie bucket en
   praat nooit met 'n sjabloon-diens nie.

   TIPOGRAFIE — Impact is Monotype s'n en mag nie versprei word nie. Anton is
   OFL en het al die Afrikaanse diakritiese tekens (nagegaan in die font se
   cmap: ë ê ô û á é í ó ú Ê Ë Ô Û Á ' ’). Dit is 'n nabootsing, nie
   metries-versoenbaar met Impact nie — reëlbreuke sal dus van 'n oorspronklike
   verskil. */

import { beeldPlasing } from "../beeld";
import { type Kaart, type KaartSpec } from "../spec";
import { inhoudsVlak } from "../raam";

/** Klassieke wit-op-swart-omlyning. Satori ondersteun WebkitTextStroke, maar
 *  sentreer die lyn op die glifrand — 8px lees dus as ±4px buite en maak die
 *  wit dunner. Vir die egte voorkoms render ons twee lae: die omlynde een
 *  agter, skoon wit bo-op. */
function memeTeks(teks: string, grootte: number, boonste: boolean) {
  const gedeel = {
    fontFamily: "Anton",
    fontSize: grootte,
    lineHeight: 1.05,
    textAlign: "center" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  };
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        justifyContent: "center",
        [boonste ? "top" : "bottom"]: 0,
      }}
    >
      <div style={{ display: "flex", position: "relative", justifyContent: "center", width: "100%" }}>
        <div
          style={{
            ...gedeel,
            display: "flex",
            position: "absolute",
            width: "100%",
            justifyContent: "center",
            color: "#FFFFFF",
            WebkitTextStrokeWidth: Math.max(4, Math.round(grootte * 0.11)),
            WebkitTextStrokeColor: "#000000",
          }}
        >
          {teks}
        </div>
        <div style={{ ...gedeel, display: "flex", width: "100%", justifyContent: "center", color: "#FFFFFF" }}>
          {teks}
        </div>
      </div>
    </div>
  );
}

export function Meme({ kaart, spec }: { kaart: Kaart; spec: Extract<KaartSpec, { styl: "meme" }> }) {
  // Ongemerk = vollebleed; gemerk = binne die Buitelyn-raam.
  const { w: gleufW, h: gleufH } = inhoudsVlak(kaart);
  const grootte = Math.round(gleufW * (spec.boTeks.length > 28 || spec.onderTeks.length > 28 ? 0.075 : 0.105));
  const rand = Math.round(gleufH * 0.04);
  const beeldPlas = spec.beeld ? beeldPlasing(spec.beeld, { w: gleufW, h: gleufH }) : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        width: gleufW,
        height: gleufH,
        backgroundColor: "#1A1A1A",
        paddingTop: rand,
        paddingBottom: rand,
      }}
    >
      {beeldPlas ? (
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0 }}>
          { }
          <img
            alt=""
            src={spec.beeld!.url}
            width={beeldPlas.width}
            height={beeldPlas.height}
            style={{ position: "absolute", left: beeldPlas.left, top: beeldPlas.top }}
          />
        </div>
      ) : null}

      {spec.boTeks ? memeTeks(spec.boTeks, grootte, true) : <div style={{ display: "flex" }} />}
      {spec.onderTeks ? memeTeks(spec.onderTeks, grootte, false) : <div style={{ display: "flex" }} />}
    </div>
  );
}
