/* Die kaart-renderaar.

   BEDIENER-ALLEEN: hierdie module voer next/og in, wat satori + resvg +
   yoga.wasm saambring. Word dit ooit uit 'n "use client"-komponent ingevoer,
   land al daardie kode in die blaaierbundel — en die bou SLAAG, so niks kla
   nie. Die redigeerder voer spec.ts en register.ts in, nooit hierdie lêer nie
   (afgedwing deur 'n no-restricted-imports-reël in eslint.config.mjs). */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";

import { Raam } from "./raam";
import { AFMETINGS, type Kaart, type RenderKonteks } from "./spec";
import { Aanhaling } from "./styles/aanhaling";
import { GrootGetal } from "./styles/groot-getal";
import { KopBeeld } from "./styles/kop-beeld";
import { Lys } from "./styles/lys";
import { Meme } from "./styles/meme";

/* Fonte is voorheen by ELKE versoek van skyf gelees. Met vier style en 'n
   lewendige voorskou wat by elke sleutelaanslag herrender, is dit die
   goedkoopste wins hier. */
let fonteKas: Promise<{ medium: Buffer; bold: Buffer; anton: Buffer }> | null = null;

function laaiFonte() {
  fonteKas ??= (async () => {
    const [medium, bold, anton] = await Promise.all([
      readFile(path.join(process.cwd(), "assets/LeagueSpartan-500.ttf")),
      readFile(path.join(process.cwd(), "assets/LeagueSpartan-700.ttf")),
      // Anton (OFL) vir memes — Impact is Monotype s'n en mag nie gestuur word nie.
      readFile(path.join(process.cwd(), "assets/Anton-Regular.ttf")),
    ]);
    return { medium, bold, anton };
  })();
  return fonteKas;
}

/** Elke styl se binneblok. Die skakelaar is uitputtend getipeer: 'n vyfde lid
 *  van die KaartSpec-unie laat die bou hier faal totdat dit gerender word —
 *  dieselfde waarborg wat register.ts se Record aan die redigeerderkant gee. */
function rendreerInhoud(kaart: Kaart): ReactNode {
  const spec = kaart.spec;
  switch (spec.styl) {
    case "kop-beeld":
      return <KopBeeld kaart={kaart} spec={spec} />;
    case "groot-getal":
      return <GrootGetal kaart={kaart} spec={spec} />;
    case "aanhaling":
      return <Aanhaling kaart={kaart} spec={spec} />;
    case "lys":
      return <Lys kaart={kaart} spec={spec} />;
    case "meme":
      return <Meme kaart={kaart} spec={spec} />;
  }
}

export async function renderKaart(kaart: Kaart, ctx: RenderKonteks): Promise<Buffer> {
  const { medium, bold, anton } = await laaiFonte();
  const { w, h } = AFMETINGS[kaart.vorm];
  const skaal = ctx.skaal && ctx.skaal > 0 && ctx.skaal <= 1 ? ctx.skaal : 1;

  const boom = (
    <Raam kaart={kaart} datum={ctx.datum} voetskrif={ctx.voetskrif}>
      {rendreerInhoud(kaart)}
    </Raam>
  );

  /* Halfskaal-voorskou: die stylkode bly in EEN vaste 1080-koördinaatstelsel
     en ons skaal die hele boom. Geverifieer teen satori se gebundelde weergawe
     — transform + transformOrigin werk, en 'n 0.5-render is 'n kwart van die
     rasteriseringswerk. */
  const wortel =
    skaal === 1 ? (
      boom
    ) : (
      <div
        style={{
          display: "flex",
          width: w,
          height: h,
          transform: `scale(${skaal})`,
          transformOrigin: "top left",
        }}
      >
        {boom}
      </div>
    );

  const res = new ImageResponse(wortel, {
    width: Math.round(w * skaal),
    height: Math.round(h * skaal),
    fonts: [
      { name: "LeagueSpartan", data: medium, weight: 500 },
      { name: "LeagueSpartan", data: bold, weight: 700 },
      { name: "Anton", data: anton, weight: 400 },
    ],
  });
  return Buffer.from(await res.arrayBuffer());
}
