"use client";

import { useRef, useState } from "react";
import { beeldPlasing } from "@/lib/kaart/beeld";
import { normaliseerBeeld, type BeeldBron } from "@/lib/kaart/spec";

/* Sleep-om-te-skuif + zoem-skuifie.

   Die oorlegger en satori roep DIESELFDE suiwer funksie (lib/kaart/beeld.ts),
   so wat AP hier sleep is presies wat gerender word. Dit is die een plek waar
   'n blaaier-namaaksel eerlik is: daar is geen teks in nie, dus geen
   font-verskil om te dryf nie.

   Niks word gebak nie — die snit is drie getalle op die spec. 'n Kaart kan
   weke later heropen en selfs in 'n ander vorm herrender word met die
   fokuspunt behoue. */

/** Die voorskou-boks pas by die WERKLIKE gleuf se verhouding, nie 'n vaste
 *  landskap nie — anders wys die snit iets anders as wat gerender word. */
const MAKS_W = 320;
const MAKS_H = 260;
function voorskouGleuf(g: { w: number; h: number }) {
  const s = Math.min(MAKS_W / g.w, MAKS_H / g.h);
  return { w: Math.round(g.w * s), h: Math.round(g.h * s) };
}

export function BeeldSnyer({
  bron,
  datum,
  gleuf,
  stel,
  verwyder,
}: {
  bron: BeeldBron;
  datum: string;
  /** Die werklike gleuf op die kaart (uit lib/kaart/mate.ts). */
  gleuf: { w: number; h: number; rond: boolean };
  stel: (nuut: BeeldBron) => void;
  verwyder: () => void;
}) {
  const GLEUF = voorskouGleuf(gleuf);
  const [sleep, setSleep] = useState(false);
  const [besig, setBesig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const laaste = useRef<{ x: number; y: number } | null>(null);
  const plasing = beeldPlasing(bron, GLEUF);

  /** Hou die snit wat AP reeds gekies het — net die beeld self verander. */
  function pasToe(data: { url: string; wydte: number; hoogte: number }) {
    const nuwe = normaliseerBeeld({
      url: data.url,
      wydte: data.wydte,
      hoogte: data.hoogte,
      deursigtig: true,
      fokusX: bron.fokusX,
      fokusY: bron.fokusY,
      zoem: bron.zoem,
    });
    if (nuwe) stel(nuwe);
  }

  /* Agtergrond-verwydering loop op Replicate (851-labs/background-remover):
     ±3-5s, werk op enige toestel, en die roete herhuisves die uitset dadelik
     in ons eie bucket — Replicate se URL's verval binne 'n uur. */
  async function haalAgtergrondUit() {
    setFout(null);
    setBesig("Verwyder agtergrond…");
    try {
      const res = await fetch("/api/beeld/agtergrond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: bron.url, datum }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.fout ?? "Kon nie die agtergrond verwyder nie.");
        return;
      }
      pasToe(data);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Kon nie die agtergrond verwyder nie.");
    } finally {
      setBesig(null);
    }
  }

  function begin(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    laaste.current = { x: e.clientX, y: e.clientY };
    setSleep(true);
  }

  function beweeg(e: React.PointerEvent) {
    if (!sleep || !laaste.current) return;
    const dx = e.clientX - laaste.current.x;
    const dy = e.clientY - laaste.current.y;
    laaste.current = { x: e.clientX, y: e.clientY };

    // Skuif die FOKUS, nie die beeld nie: 'n sleep na regs moet meer van die
    // linkerkant wys, dus daal fokusX. Die skaal is die oorskot, sodat een
    // pixel se sleep een pixel se beweging is.
    const oorX = plasing.width - GLEUF.w;
    const oorY = plasing.height - GLEUF.h;
    stel({
      ...bron,
      fokusX: oorX > 0 ? Math.min(1, Math.max(0, bron.fokusX - dx / oorX)) : bron.fokusX,
      fokusY: oorY > 0 ? Math.min(1, Math.max(0, bron.fokusY - dy / oorY)) : bron.fokusY,
    });
  }

  function eindig(e: React.PointerEvent) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    laaste.current = null;
    setSleep(false);
  }

  return (
    <div className="mt-1 border-2 border-ink bg-paper p-3">
      <div
        onPointerDown={begin}
        onPointerMove={beweeg}
        onPointerUp={eindig}
        onPointerCancel={eindig}
        style={{ width: GLEUF.w, height: GLEUF.h }}
        className={`relative mx-auto overflow-hidden border-2 border-ink bg-offwhite ${
          gleuf.rond ? "rounded-full" : ""
        } ${sleep ? "cursor-grabbing" : "cursor-grab"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bron.url}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: plasing.left,
            top: plasing.top,
            width: plasing.width,
            height: plasing.height,
            maxWidth: "none",
          }}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs font-semibold">Zoem</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={bron.zoem}
          onChange={(e) => stel({ ...bron, zoem: Number(e.target.value) })}
          className="h-1 flex-1 accent-[#1A1A1A]"
        />
        <span className="w-10 text-right text-xs tabular-nums text-ink/60">
          {bron.zoem.toFixed(2)}×
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => stel({ ...bron, fokusX: 0.5, fokusY: 0.5, zoem: 1 })}
          className="border-2 border-ink bg-offwhite px-3 py-1 text-xs font-semibold hover:bg-paper"
        >
          Herstel
        </button>
        {/* Nooit outomaties nie — dit kos 'n Replicate-lopie. */}
        <button
          type="button"
          onClick={haalAgtergrondUit}
          disabled={besig !== null || bron.deursigtig}
          title={
            bron.deursigtig
              ? "Hierdie beeld het reeds 'n deursigtige agtergrond"
              : "±8 sekondes — die uitset word in ons eie bucket gestoor"
          }
          className="border-2 border-ink bg-offwhite px-3 py-1 text-xs font-semibold hover:bg-paper disabled:opacity-40"
        >
          Verwyder agtergrond
        </button>
        <button
          type="button"
          onClick={verwyder}
          className="border-2 border-ink bg-offwhite px-3 py-1 text-xs font-semibold hover:bg-paper"
        >
          Verwyder beeld
        </button>
        <span className="text-xs text-ink/50">
          gleuf {gleuf.w}×{gleuf.h}
          {gleuf.rond ? " (rond)" : ""} · bron {bron.wydte}×{bron.hoogte}
          {bron.deursigtig ? " · deursigtig" : ""}
        </span>
      </div>

      {besig ? (
        <div className="mt-2 border-2 border-ink bg-offwhite p-2">
          <p className="text-xs font-semibold">{besig}</p>
        </div>
      ) : null}

      {fout ? <p className="mt-2 text-xs font-semibold text-red">{fout}</p> : null}
    </div>
  );
}
