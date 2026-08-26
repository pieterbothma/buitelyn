"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { gloedKas, gloedSvgUrl } from "@/lib/duimnael/gloed";
import { laagKas } from "@/lib/duimnael/laag";
import { GLOED_VERSTEK, RAAM, type Duimnael, type Laag } from "@/lib/duimnael/spec";
import type { Reaksie } from "@/app/actions-duimnael";

/* Die redigeerder.

   Die oorlegger roep laagKas — DIESELFDE funksie as die renderaar — en skaal
   net die uitset met die voorskou se breedte. Daar is dus geen tweede
   uitleg-implementering wat kan wegdryf nie: wat AP hier sleep is presies wat
   satori teken. */

const VOORSKOU_BREEDTE = 960;

export function DuimnaelStudio({
  reaksies,
  verstekPrompt,
}: {
  reaksies: Reaksie[];
  verstekPrompt: string;
}) {
  const [duimnael, setDuimnael] = useState<Duimnael>({ agtergrond: null, lae: [] });
  const [prompt, setPrompt] = useState(verstekPrompt);
  const [verwysings, setVerwysings] = useState<File[]>([]);
  const [besig, setBesig] = useState<string | null>(null);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [gekies, setGekies] = useState<number | null>(null);
  const raamRef = useRef<HTMLDivElement>(null);

  const skaal = VOORSKOU_BREEDTE / RAAM.w;

  const stelLaag = useCallback((i: number, verander: (l: Laag) => Laag) => {
    setDuimnael((d) => ({ ...d, lae: d.lae.map((l, j) => (j === i ? verander(l) : l)) }));
  }, []);

  // ---- sleep ----
  const sleep = useCallback(
    (i: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      setGekies(i);
      const raam = raamRef.current;
      if (!raam) return;
      const kas = raam.getBoundingClientRect();
      const beweeg = (ev: PointerEvent) => {
        const x = Math.min(1, Math.max(0, (ev.clientX - kas.left) / kas.width));
        const y = Math.min(1, Math.max(0, (ev.clientY - kas.top) / kas.height));
        stelLaag(i, (l) => ({ ...l, plek: { ...l.plek, x, y } }));
      };
      const los = () => {
        window.removeEventListener("pointermove", beweeg);
        window.removeEventListener("pointerup", los);
      };
      window.addEventListener("pointermove", beweeg);
      window.addEventListener("pointerup", los);
    },
    [stelLaag]
  );

  // ---- agtergrond genereer ----
  async function genereerAgtergrond() {
    if (verwysings.length === 0) {
      setBoodskap("Laai eers 'n verwysingsbeeld op.");
      return;
    }
    setBesig("Agtergrond word gemaak — dit vat 30-60s…");
    setBoodskap(null);
    const vorm = new FormData();
    vorm.append("prompt", prompt);
    for (const v of verwysings) vorm.append("verwysing", v);
    const res = await fetch("/api/duimnael/agtergrond", { method: "POST", body: vorm });
    const data = await res.json();
    setBesig(null);
    if (!res.ok) {
      setBoodskap(data.fout ?? "Die agtergrond kon nie gemaak word nie.");
      return;
    }
    setDuimnael((d) => ({
      ...d,
      agtergrond: {
        url: data.url,
        wydte: data.wydte,
        hoogte: data.hoogte,
        fokusX: 0.5,
        fokusY: 0.5,
        zoem: 1,
        deursigtig: false,
      },
    }));
  }

  // ---- lae byvoeg ----
  function kiesReaksie(r: Reaksie) {
    const beeld = new Image();
    beeld.onload = () => {
      setDuimnael((d) => ({
        ...d,
        lae: [
          ...d.lae.filter((l) => l.soort !== "reaksie"),
          {
            soort: "reaksie",
            url: r.url,
            wydte: beeld.naturalWidth,
            hoogte: beeld.naturalHeight,
            plek: { x: 0.25, y: 0.55, grootte: 0.55 },
            gloed: GLOED_VERSTEK,
          },
        ],
      }));
    };
    beeld.src = r.url;
  }

  function voegTeksBy() {
    setDuimnael((d) => ({
      ...d,
      lae: [
        ...d.lae,
        { soort: "teks", teks: "NUWE TEKS", kleur: "wit", belyn: "links", plek: { x: 0.5, y: 0.12, grootte: 0.09 } },
      ],
    }));
  }

  function voegLogoBy(kleur: "ink" | "wit") {
    setDuimnael((d) => ({
      ...d,
      lae: [...d.lae.filter((l) => l.soort !== "logo"), { soort: "logo", kleur, plek: { x: 0.9, y: 0.85, grootte: 0.12 } }],
    }));
  }

  function verwyderLaag(i: number) {
    setDuimnael((d) => ({ ...d, lae: d.lae.filter((_, j) => j !== i) }));
    setGekies(null);
  }

  // ---- aflaai ----
  async function laaiAf() {
    setBesig("Duimnael word gerender…");
    const res = await fetch("/api/duimnael/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ duimnael, skaal: 1 }),
    });
    setBesig(null);
    if (!res.ok) {
      setBoodskap("Die render het misluk.");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "duimnael.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const agtergrondStyl = useMemo(() => {
    if (!duimnael.agtergrond) return undefined;
    return {
      backgroundImage: `url(${duimnael.agtergrond.url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    } as const;
  }, [duimnael.agtergrond]);

  const gekose = gekies !== null ? duimnael.lae[gekies] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_20rem]">
      <div>
        {/* Die voorskou. Alles hierbinne word deur laagKas geposisioneer. */}
        <div
          ref={raamRef}
          className="relative overflow-hidden border-2 border-ink bg-[#0B0B0B]"
          style={{ width: VOORSKOU_BREEDTE, height: VOORSKOU_BREEDTE * (RAAM.h / RAAM.w), ...agtergrondStyl }}
        >
          {duimnael.lae.map((laag, i) => {
            const k = laagKas(laag, RAAM);
            const g = gloedKas(laag, RAAM);
            return (
              <div key={i}>
                {g && laag.soort === "reaksie" ? (
                  <img
                    alt=""
                    src={gloedSvgUrl(laag.gloed)}
                    style={{
                      position: "absolute",
                      left: g.left * skaal,
                      top: g.top * skaal,
                      width: g.width * skaal,
                      height: g.height! * skaal,
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
                <div
                  onPointerDown={sleep(i)}
                  style={{
                    position: "absolute",
                    left: k.left * skaal,
                    top: k.top * skaal,
                    width: k.width * skaal,
                    height: k.height ? k.height * skaal : undefined,
                    cursor: "grab",
                    outline: gekies === i ? "2px solid #E2231A" : "none",
                  }}
                >
                  {laag.soort === "teks" ? (
                    <div
                      style={{
                        // Geverifieer in app/layout.tsx: die next/font-veranderlike heet --font-spartan.
                        // 'n Verkeerde naam val stil na sans-serif terug terwyl satori League
                        // Spartan render — en dan lieg die voorskou.
                        fontFamily: "var(--font-spartan), sans-serif",
                        fontWeight: 700,
                        fontSize: k.fontSize! * skaal,
                        lineHeight: 1.02,
                        letterSpacing: "-0.02em",
                        color: laag.kleur === "wit" ? "#FFFFFF" : "#111111",
                        textAlign: laag.belyn === "middel" ? "center" : laag.belyn === "regs" ? "right" : "left",
                        textShadow: laag.kleur === "wit" ? "0 4px 18px rgba(0,0,0,0.55)" : "none",
                        userSelect: "none",
                      }}
                    >
                      {laag.teks}
                    </div>
                  ) : (
                    <img
                      alt=""
                      src={laag.soort === "logo" ? `/logo-${laag.kleur}.png` : laag.url}
                      style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {besig ? <p className="mt-3 text-sm text-ink/60">{besig}</p> : null}
        {boodskap ? <p className="mt-3 text-sm text-red">{boodskap}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={voegTeksBy} className="border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper">
            + Teks
          </button>
          <button onClick={() => voegLogoBy("wit")} className="border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper">
            + Logo (wit)
          </button>
          <button onClick={() => voegLogoBy("ink")} className="border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper">
            + Logo (swart)
          </button>
          <button onClick={laaiAf} className="border-2 border-ink bg-ink px-3 py-1.5 text-sm font-bold text-paper">
            Laai af (1280×720)
          </button>
        </div>
      </div>

      <aside className="space-y-6">
        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide">1 · Reaksie</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {reaksies.map((r) => (
              <button key={r.naam} onClick={() => kiesReaksie(r)} className="border-2 border-ink hover:bg-paper">
                <img alt={r.naam} src={r.url} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
          {reaksies.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">Nog geen reaksies nie — loop die saai-skrip.</p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide">2 · Agtergrond</h2>
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={(e) => setVerwysings(Array.from(e.target.files ?? []).slice(0, 4))}
            className="mt-2 block w-full text-sm"
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="mt-2 w-full border-2 border-ink bg-offwhite p-2 text-xs"
          />
          <button
            onClick={genereerAgtergrond}
            disabled={besig !== null}
            className="mt-2 w-full border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper disabled:opacity-40"
          >
            Maak agtergrond
          </button>
        </section>

        {gekose ? (
          <section>
            <h2 className="text-sm font-extrabold uppercase tracking-wide">3 · Gekose laag</h2>
            {gekose.soort === "teks" ? (
              <>
                <textarea
                  value={gekose.teks}
                  onChange={(e) => stelLaag(gekies!, (l) => ({ ...l, teks: e.target.value }) as Laag)}
                  rows={2}
                  className="mt-2 w-full border-2 border-ink bg-offwhite p-2 text-sm"
                />
                <select
                  value={gekose.belyn}
                  onChange={(e) => stelLaag(gekies!, (l) => ({ ...l, belyn: e.target.value }) as Laag)}
                  className="mt-2 w-full border-2 border-ink bg-offwhite p-1.5 text-sm"
                >
                  <option value="links">Links belyn</option>
                  <option value="middel">Gesentreer</option>
                  <option value="regs">Regs belyn</option>
                </select>
              </>
            ) : null}
            <label className="mt-3 block text-xs font-bold uppercase">Grootte</label>
            <input
              type="range"
              min={0.02}
              max={1}
              step={0.005}
              value={gekose.plek.grootte}
              onChange={(e) =>
                stelLaag(gekies!, (l) => ({ ...l, plek: { ...l.plek, grootte: Number(e.target.value) } }))
              }
              className="w-full"
            />
            {gekose.soort === "reaksie" ? (
              <>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={gekose.gloed.aan}
                    onChange={(e) =>
                      stelLaag(gekies!, (l) =>
                        l.soort === "reaksie" ? { ...l, gloed: { ...l.gloed, aan: e.target.checked } } : l
                      )
                    }
                  />
                  Rooi gloed
                </label>
                <label className="mt-2 block text-xs font-bold uppercase">Gloed-radius</label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={gekose.gloed.radius}
                  onChange={(e) =>
                    stelLaag(gekies!, (l) =>
                      l.soort === "reaksie" ? { ...l, gloed: { ...l.gloed, radius: Number(e.target.value) } } : l
                    )
                  }
                  className="w-full"
                />
              </>
            ) : null}
            <button
              onClick={() => verwyderLaag(gekies!)}
              className="mt-3 w-full border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper"
            >
              Verwyder laag
            </button>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
