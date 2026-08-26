/* Die duimnael-renderaar.

   BEDIENER-ALLEEN: hierdie module voer next/og in, wat satori + resvg +
   yoga.wasm saambring. Word dit ooit uit 'n "use client"-komponent ingevoer,
   land al daardie kode in die blaaierbundel — en die bou SLAAG, so niks kla
   nie. Die redigeerder voer spec.ts, laag.ts en gloed.ts in, nooit hierdie
   lêer nie (afgedwing deur no-restricted-imports in eslint.config.mjs). */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";

import { beeldPlasing } from "@/lib/kaart/beeld";
import { gloedKas, gloedSvgUrl } from "./gloed";
import { laagKas } from "./laag";
import { RAAM, type Duimnael, type Laag } from "./spec";

/* Fonte EN die logo's word een keer van skyf gelees en gekas. Met 'n lewendige
   voorskou wat by elke sleutelaanslag herrender, is dit die goedkoopste wins.

   Die logo word as 'n data:-URI ingebed, NIE oor HTTP gehaal nie. satori sou
   andersins NEXT_PUBLIC_SITE_URL moes gebruik — wat na produksie wys
   (hq.buitelyn.com) — en 'n plaaslike of CI-render sou 'n logo probeer haal wat
   nog nie ontplooi is nie. Die logo sou dan stil uit die duimnael verdwyn.
   Van skyf af lees werk aflyn, in toetse, en voor die eerste ontplooiing. */
let bateKas: Promise<{ bold: Buffer; logo: Record<"ink" | "wit", string> }> | null = null;

function laaiBates() {
  bateKas ??= (async () => {
    const [bold, ink, wit] = await Promise.all([
      readFile(path.join(process.cwd(), "assets/LeagueSpartan-700.ttf")),
      readFile(path.join(process.cwd(), "assets/logo-ink.png")),
      readFile(path.join(process.cwd(), "assets/logo-wit.png")),
    ]);
    return {
      bold,
      logo: {
        ink: `data:image/png;base64,${ink.toString("base64")}`,
        wit: `data:image/png;base64,${wit.toString("base64")}`,
      },
    };
  })();
  return bateKas;
}

function teken(laag: Laag, sleutel: number, logo: Record<"ink" | "wit", string>): ReactNode {
  const k = laagKas(laag, RAAM);

  if (laag.soort === "teks") {
    return (
      <div
        key={sleutel}
        style={{
          position: "absolute",
          left: k.left,
          top: k.top,
          width: k.width,
          display: "flex",
          flexDirection: "column",
          fontFamily: "LeagueSpartan",
          fontWeight: 700,
          fontSize: k.fontSize,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: laag.kleur === "wit" ? "#FFFFFF" : "#111111",
          textAlign: laag.belyn === "middel" ? "center" : laag.belyn === "regs" ? "right" : "left",
          textShadow: laag.kleur === "wit" ? "0 4px 18px rgba(0,0,0,0.55)" : "none",
        }}
      >
        {laag.teks}
      </div>
    );
  }

  const bron = laag.soort === "logo" ? logo[laag.kleur] : laag.url;
  /* Net die reaksie kan gespieël word. Die logo mag nooit — 'n omgekeerde
     Buitelyn-logo is 'n verkeerde logo. */
  const spieël = laag.soort === "reaksie" && laag.spieël;
  return (
    <img
      key={sleutel}
      alt=""
      src={bron}
      width={k.width}
      height={k.height}
      style={{
        position: "absolute",
        left: k.left,
        top: k.top,
        objectFit: "contain",
        ...(spieël ? { transform: "scaleX(-1)" } : {}),
      }}
    />
  );
}

export async function renderDuimnael(duimnael: Duimnael, skaal = 1): Promise<Buffer> {
  const { bold, logo } = await laaiBates();
  const s = skaal > 0 && skaal <= 1 ? skaal : 1;

  const agtergrond = duimnael.agtergrond
    ? beeldPlasing(duimnael.agtergrond, { w: RAAM.w, h: RAAM.h })
    : null;

  const boom = (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: RAAM.w,
        height: RAAM.h,
        overflow: "hidden",
        backgroundColor: "#0B0B0B",
      }}
    >
      {duimnael.agtergrond && agtergrond ? (
        <img
          alt=""
          src={duimnael.agtergrond.url}
          width={agtergrond.width}
          height={agtergrond.height}
          style={{ position: "absolute", left: agtergrond.left, top: agtergrond.top }}
        />
      ) : null}

      {duimnael.lae.map((laag, i) => {
        const g = gloedKas(laag, RAAM);
        /* Die gloed word SAAM met sy reaksie geteken, net daaronder, sodat dit
           hom volg wanneer hy gesleep word. */
        return (
          <div key={`groep-${i}`} style={{ display: "flex" }}>
            {g && laag.soort === "reaksie" ? (
              <img
                alt=""
                src={gloedSvgUrl(laag.gloed)}
                width={g.width}
                height={g.height}
                style={{ position: "absolute", left: g.left, top: g.top }}
              />
            ) : null}
            {teken(laag, i, logo)}
          </div>
        );
      })}
    </div>
  );

  /* Halfskaal-voorskou: die kode bly in EEN vaste 1280-koördinaatstelsel en ons
     skaal die hele boom. transform + transformOrigin werk in satori, en 'n
     halwe render is 'n kwart van die rasteriseringswerk. */
  const wortel =
    s === 1 ? (
      boom
    ) : (
      <div
        style={{
          display: "flex",
          width: RAAM.w,
          height: RAAM.h,
          transform: `scale(${s})`,
          transformOrigin: "top left",
        }}
      >
        {boom}
      </div>
    );

  const res = new ImageResponse(wortel, {
    width: Math.round(RAAM.w * s),
    height: Math.round(RAAM.h * s),
    fonts: [{ name: "LeagueSpartan", data: bold, weight: 700 }],
  });
  return Buffer.from(await res.arrayBuffer());
}
