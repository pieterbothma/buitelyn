/* Groot getal: een syfer wat die storie dra. BEDIENER-ALLEEN. */

import { RIGTING_KLEUR, sagteTeksKleur } from "../tokens";
import { tipo } from "../raam";
import type { Kaart, KaartSpec } from "../spec";

/** Die syfer moet die kaart vul sonder om oor te loop. Een reël teks met 'n
 *  bekende maksimum lengte is die enigste geval waar 'n eenvoudige
 *  interpolasie op lengte betroubaar is — vandaar hierdie tabel eerder as
 *  algemene outo-passing. */
function getalGrootte(basis: number, lengte: number): number {
  if (lengte <= 4) return basis;
  if (lengte <= 6) return Math.round(basis * 0.78);
  if (lengte <= 8) return Math.round(basis * 0.62);
  return Math.round(basis * 0.5);
}

/** Die pyltjie is 'n SVG-pad, NIE 'n ▲/▼-karakter nie.
 *
 *  League Spartan bevat daardie glief nie, en satori probeer dan 'n dinamiese
 *  Google-font aflaai — op Vercel is dit 'n uitgaande netwerk-oproep by ELKE
 *  render, en dit misluk hier met 'n 400. Inline SVG is die patroon wat
 *  grafiek-render.tsx reeds gebruik. */
function Pyl({ rigting, grootte, kleur }: { rigting: "op" | "af"; grootte: number; kleur: string }) {
  const d = rigting === "op" ? "M12,3 L22,20 L2,20 Z" : "M12,21 L2,4 L22,4 Z";
  return (
    <svg width={grootte} height={grootte} viewBox="0 0 24 24" style={{ display: "flex", alignSelf: "center" }}>
      <path d={d} fill={kleur} />
    </svg>
  );
}

export function GrootGetal({
  kaart,
  spec,
}: {
  kaart: Kaart;
  spec: Extract<KaartSpec, { styl: "groot-getal" }>;
}) {
  const t = tipo(kaart.vorm);
  const kleur = RIGTING_KLEUR[spec.rigting];
  const sag = sagteTeksKleur(kaart.vel);
  const grootte = getalGrootte(t.getal, spec.getal.length);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        gap: Math.round(t.byskrif * 0.5),
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: Math.round(grootte * 0.08) }}>
        {spec.rigting !== "neutraal" ? (
          <Pyl rigting={spec.rigting} grootte={Math.round(grootte * 0.38)} kleur={kleur} />
        ) : null}
        <div style={{ display: "flex", fontSize: grootte, fontWeight: 700, lineHeight: 1, color: kleur }}>
          {spec.getal}
        </div>
        {spec.eenheid ? (
          <div
            style={{
              display: "flex",
              fontSize: Math.round(grootte * 0.3),
              fontWeight: 500,
              color: kleur,
            }}
          >
            {spec.eenheid}
          </div>
        ) : null}
      </div>

      {spec.etiket ? (
        <div style={{ display: "flex", fontSize: t.byskrif, fontWeight: 700, lineHeight: 1.15 }}>
          {spec.etiket}
        </div>
      ) : null}

      {spec.konteks ? (
        <div
          style={{
            display: "flex",
            fontSize: Math.round(t.byskrif * 0.78),
            fontWeight: 500,
            color: sag,
            lineHeight: 1.3,
          }}
        >
          {spec.konteks}
        </div>
      ) : null}
    </div>
  );
}
