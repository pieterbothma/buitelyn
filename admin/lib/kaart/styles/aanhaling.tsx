/* Aanhaling met spreker. BEDIENER-ALLEEN. */

import { beeldPlasing } from "../beeld";
import { lynKleur, ROOI, sagteTeksKleur } from "../tokens";
import { tipo } from "../raam";
import type { Kaart, KaartSpec } from "../spec";

export function Aanhaling({
  kaart,
  spec,
}: {
  kaart: Kaart;
  spec: Extract<KaartSpec, { styl: "aanhaling" }>;
}) {
  const t = tipo(kaart.vorm);
  const sag = sagteTeksKleur(kaart.vel);
  const lyn = lynKleur(kaart.vel);
  // Lang aanhalings krimp; kort aanhalings kry die volle grootte.
  const grootte =
    spec.aanhaling.length > 180
      ? Math.round(t.aanhaling * 0.68)
      : spec.aanhaling.length > 110
        ? Math.round(t.aanhaling * 0.82)
        : t.aanhaling;
  const portretGrootte = Math.round(t.byskrif * 2);
  const portretPlasing = spec.beeld
    ? beeldPlasing(spec.beeld, { w: portretGrootte, h: portretGrootte })
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        gap: Math.round(grootte * 0.35),
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: Math.round(grootte * 1.6),
          fontWeight: 700,
          lineHeight: 0.8,
          color: ROOI,
        }}
      >
        &ldquo;
      </div>

      <div style={{ display: "flex", fontSize: grootte, fontWeight: 700, lineHeight: 1.18 }}>
        {spec.aanhaling}
      </div>

      {spec.naam || spec.rol || spec.beeld ? (
        <div style={{ display: "flex", alignItems: "center", gap: Math.round(t.byskrif * 0.5) }}>
          {spec.beeld && portretPlasing ? (
            <div
              style={{
                display: "flex",
                position: "relative",
                overflow: "hidden",
                width: portretGrootte,
                height: portretGrootte,
                borderRadius: 999,
              }}
            >
                      <img
                alt=""
                src={spec.beeld.url}
                width={portretPlasing.width}
                height={portretPlasing.height}
                style={{ position: "absolute", left: portretPlasing.left, top: portretPlasing.top }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", width: Math.round(t.byskrif * 1.4), height: 3, backgroundColor: lyn }} />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {spec.naam ? (
              <div style={{ display: "flex", fontSize: Math.round(t.byskrif * 0.85), fontWeight: 700 }}>
                {spec.naam}
              </div>
            ) : null}
            {spec.rol ? (
              <div
                style={{
                  display: "flex",
                  fontSize: Math.round(t.byskrif * 0.7),
                  fontWeight: 500,
                  color: sag,
                }}
              >
                {spec.rol}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
