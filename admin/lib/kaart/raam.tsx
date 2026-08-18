/* Die Buitelyn-raam: papiervel, ink-rand, woordmerk en voetskrif.
   Elke styl render BINNE hierdie raam — dit is wat keer dat vier style vier
   handelsmerke word.

   BEDIENER-ALLEEN (satori-JSX). Moet nooit uit components/ ingevoer word nie. */

import type { ReactNode } from "react";
import { INK, INK_SAG, ROOI, VELLE } from "./tokens";
import { VERSTEK_VOETSKRIF, type Kaart } from "./spec";
import { raamMate } from "./mate";

// Her-uitgevoer sodat styles/* steeds "../raam" kan invoer.
export { raamMate, tipo, gleufVir, inhoudsVlak, type RaamMate, type Tipo } from "./mate";

function datumWoorde(datum: string): string {
  return new Intl.DateTimeFormat("af-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${datum}T12:00:00Z`));
}

export function Raam({
  kaart,
  datum,
  voetskrif = VERSTEK_VOETSKRIF,
  children,
}: {
  kaart: Kaart;
  datum: string;
  voetskrif?: string;
  children: ReactNode;
}) {
  const mate = raamMate(kaart.vorm);
  const vel = VELLE[kaart.vel];
  const opInk = kaart.vel === "ink" || kaart.vel === "rooi";
  // Op 'n donker vel moet die binnepaneel en lyne omkeer, anders verdwyn hulle.
  const randKleur = opInk ? vel.teks : INK;
  const paneel = opInk ? vel.agtergrond : VELLE.offwhite.agtergrond;
  const sagteTeks = opInk ? vel.teks : INK_SAG;

  // Sonder die merk: VOLLEBLEED — geen padding, geen raam, geen voetskrif.
  // 'n Meme met 'n wit rand daarom lyk verkeerd; wie merk uitskakel, wil die
  // hele blad hê.
  if (!kaart.merk) {
    return (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          backgroundColor: vel.agtergrond, color: vel.teks,
          fontFamily: "LeagueSpartan",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        backgroundColor: vel.agtergrond,
        paddingLeft: mate.buiteX, paddingRight: mate.buiteX,
        paddingTop: mate.buiteBo, paddingBottom: mate.buiteOnder,
        fontFamily: "LeagueSpartan",
        color: vel.teks,
      }}
    >
      <div
        style={{
          display: "flex", flexDirection: "column", flex: 1,
          border: `${mate.rand}px solid ${randKleur}`,
          backgroundColor: paneel,
          padding: mate.binne,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: mate.merk, fontWeight: 700 }}>Buitelyn</div>
          <div
            style={{
              width: mate.kol, height: mate.kol, borderRadius: 999,
              backgroundColor: ROOI, display: "flex",
            }}
          />
        </div>

        {children}

        <div
          style={{
            display: "flex", justifyContent: "space-between",
            borderTop: `${mate.voetLyn}px solid ${randKleur}`,
            paddingTop: mate.voetPad,
            fontSize: mate.voet, fontWeight: 500, color: sagteTeks,
          }}
        >
          <div style={{ display: "flex" }}>{datumWoorde(datum)}</div>
          <div style={{ display: "flex", fontWeight: 700, color: opInk ? vel.teks : INK }}>
            {voetskrif}
          </div>
        </div>
      </div>
    </div>
  );
}
