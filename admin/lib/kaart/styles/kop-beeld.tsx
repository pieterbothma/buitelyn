/* Kop + byskrif, met of sonder 'n beeld, in drie uitlegte.
   BEDIENER-ALLEEN. */

import { beeldPlasing } from "../beeld";
import { sagteTeksKleur, VELLE } from "../tokens";
import { inhoudsVlak, tipo } from "../raam";
import { type BeeldBron, type Kaart, type KaartSpec } from "../spec";

/* Die gleuf kom uit lib/kaart/mate.ts — DIESELFDE funksie wat die blaaier se
   snit-oorlegger gebruik. Dit was voorheen hier gedupliseer, en die UI het toe
   'n ander vorm gewys as wat gerender is. */

function Beeld({ bron, w, h, rond = false }: { bron: BeeldBron; w: number; h: number; rond?: boolean }) {
  const p = beeldPlasing(bron, { w, h });
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        overflow: "hidden",
        width: w,
        height: h,
        borderRadius: rond ? 999 : 0,
        // 'n Uitgesnyde PNG kry 'n effe vel agter hom sodat hy nie in die lug hang nie.
        backgroundColor: bron.deursigtig ? VELLE.paper.agtergrond : "transparent",
      }}
    >
      <img
        alt=""
        src={bron.url}
        width={p.width}
        height={p.height}
        style={{ position: "absolute", left: p.left, top: p.top }}
      />
    </div>
  );
}

export function KopBeeld({ kaart, spec }: { kaart: Kaart; spec: Extract<KaartSpec, { styl: "kop-beeld" }> }) {
  const t = tipo(kaart.vorm);
  const { w: binneW, h: binneH, gaping } = inhoudsVlak(kaart);
  const kopGrootte = spec.kop.length > 40 ? t.kopKlein : t.kopGroot;

  /* 'n ARRAY, nie 'n <>-fragment nie. Satori vou 'n fragment nie in die
     ouer se flex-kinders uit nie: die kop en byskrif beland langs mekaar in
     plaas van onder mekaar. Geverifieer deur die render te vergelyk. */
  function teksBlok(kleur?: string) {
    const dele = [];
    if (spec.etiket) {
      dele.push(
        <div key="etiket" style={{ fontSize: t.etiket, fontWeight: 700, letterSpacing: 2 }}>
          {spec.etiket.toUpperCase()}
        </div>
      );
    }
    dele.push(
      <div key="kop" style={{ fontSize: kopGrootte, fontWeight: 700, lineHeight: 1.05 }}>
        {spec.kop}
      </div>
    );
    if (spec.byskrif) {
      dele.push(
        <div
          key="byskrif"
          style={{
            fontSize: t.byskrif,
            fontWeight: 500,
            color: kleur ?? sagteTeksKleur(kaart.vel),
            lineHeight: 1.3,
          }}
        >
          {spec.byskrif}
        </div>
      );
    }
    return dele;
  }

  // Geen beeld → presies die oorspronklike uitleg: gesentreerde teks, flex 1.
  if (!spec.beeld) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: gaping,
        }}
      >
        {teksBlok()}
      </div>
    );
  }

  if (spec.uitleg === "beeld-agter") {
    // Beeld vul die paneel; 'n donker skerm onder maak die teks leesbaar.
    return (
      <div style={{ display: "flex", flex: 1, position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0 }}>
          <Beeld bron={spec.beeld} w={binneW} h={binneH} />
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            top: 0,
            width: binneW,
            height: binneH,
            backgroundImage: "linear-gradient(180deg, rgba(26,26,26,0.15) 30%, rgba(26,26,26,0.86) 100%)",
          }}
        />
        {/* Die teks word van die beeld se rand af ingespring. Sonder die
            padding sny die overflow:hidden die laaste reël se stertjies af —
            en teks wat die rand raak lyk in elk geval na 'n fout. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "flex-end",
            gap: Math.round(gaping * 0.6),
            padding: gaping,
            color: VELLE.offwhite.agtergrond,
          }}
        >
          {teksBlok(VELLE.offwhite.agtergrond)}
        </div>
      </div>
    );
  }

  if (spec.uitleg === "beeld-langs") {
    const beeldW = Math.round(binneW * 0.42);
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: gaping }}>
        <Beeld bron={spec.beeld} w={beeldW} h={binneH - gaping} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: Math.round(gaping * 0.7),
          }}
        >
          {teksBlok()}
        </div>
      </div>
    );
  }

  // beeld-bo
  const beeldH = Math.round(binneH * 0.5);
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: gaping, paddingTop: gaping }}>
      <Beeld bron={spec.beeld} w={binneW} h={beeldH} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: Math.round(gaping * 0.7),
        }}
      >
        {teksBlok()}
      </div>
    </div>
  );
}
