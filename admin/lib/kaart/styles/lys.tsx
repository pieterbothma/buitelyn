/* Lys: drie tot ses punte wat op een kaart pas. BEDIENER-ALLEEN. */

import { lynKleur } from "../tokens";
import { tipo } from "../raam";
import type { Kaart, KaartSpec } from "../spec";

/** Meer items → kleiner teks. Dit is 'n harde tabel eerder as outo-passing:
 *  satori waarsku nie by oorloop nie, dit sny net stil af. */
function itemGrootte(basis: number, aantal: number): number {
  if (aantal <= 3) return basis;
  if (aantal === 4) return Math.round(basis * 0.88);
  if (aantal === 5) return Math.round(basis * 0.78);
  return Math.round(basis * 0.68);
}

export function Lys({ kaart, spec }: { kaart: Kaart; spec: Extract<KaartSpec, { styl: "lys" }> }) {
  const t = tipo(kaart.vorm);
  const lyn = lynKleur(kaart.vel);
  const items = spec.items.filter((i) => i.trim());
  const grootte = itemGrootte(t.item, items.length || 1);
  const merkGrootte = Math.round(grootte * 1.25);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        gap: Math.round(grootte * 0.7),
      }}
    >
      {spec.kop ? (
        <div
          style={{
            display: "flex",
            fontSize: spec.kop.length > 40 ? t.kopKlein : t.kopGroot,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {spec.kop}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: Math.round(grootte * 0.55) }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: Math.round(grootte * 0.5) }}>
            {spec.genommer ? (
              // Vierkante blokkie, geen ronding — neo-brutalisties, soos die res.
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: merkGrootte,
                  height: merkGrootte,
                  border: `3px solid ${lyn}`,
                  fontSize: Math.round(grootte * 0.62),
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  width: Math.round(merkGrootte * 0.34),
                  height: Math.round(merkGrootte * 0.34),
                  backgroundColor: lyn,
                  marginTop: Math.round(grootte * 0.36),
                }}
              />
            )}
            <div style={{ display: "flex", flex: 1, fontSize: grootte, fontWeight: 500, lineHeight: 1.25 }}>
              {item}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
