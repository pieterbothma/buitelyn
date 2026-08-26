"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { gloedKas, gloedSvgUrl } from "@/lib/duimnael/gloed";
import { laagKas } from "@/lib/duimnael/laag";
import { GLOED_VERSTEK, RAAM, STYLE, type Duimnael, type Laag } from "@/lib/duimnael/spec";
import type { Reaksie } from "@/app/actions-duimnael";

/* Die redigeerder.

   Die oorlegger roep laagKas — DIESELFDE funksie as die renderaar — en skaal
   net die uitset met die voorskou se breedte. Daar is dus geen tweede
   uitleg-implementering wat kan wegdryf nie: wat AP hier sleep is presies wat
   satori teken. */

const VOORSKOU_BREEDTE = 960;

/* Die roete stuur hoogstens vier verwysings na die beeldmodel. Ons dwing
   dieselfde perk hier af sodat AP dit SIEN eerder as dat die vyfde stil
   verdwyn. */
const MAKS_VERWYSINGS = 4;

/** 'n Gekose verwysingsbeeld plus sy voorskou-URL. Ons hou die object-URL by
 *  die lêer sodat ons dit weer kan vrylaat — 'n object-URL wat nooit gerevoke
 *  word nie, hou die hele beeld in geheue vir die leeftyd van die blad. */
type Verwysing = { lêer: File; voorskou: string };

export function DuimnaelStudio({
  reaksies,
  verstekPrompt,
}: {
  reaksies: Reaksie[];
  verstekPrompt: string;
}) {
  const [duimnael, setDuimnael] = useState<Duimnael>({ agtergrond: null, lae: [] });
  const [prompt, setPrompt] = useState(verstekPrompt);
  const [biblioteek, setBiblioteek] = useState<Reaksie[]>(reaksies);
  const [verwysings, setVerwysings] = useState<Verwysing[]>([]);
  const [besig, setBesig] = useState<string | null>(null);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [gekies, setGekies] = useState<number | null>(null);
  const raamRef = useRef<HTMLDivElement>(null);

  const skaal = VOORSKOU_BREEDTE / RAAM.w;

  const stelLaag = useCallback((i: number, verander: (l: Laag) => Laag) => {
    setDuimnael((d) => ({ ...d, lae: d.lae.map((l, j) => (j === i ? verander(l) : l)) }));
  }, []);

  // ---- verwysingsbeelde ----

  /* Beelde word BYGEVOEG, nie vervang nie. AP kies sy onderwerpe een-een —
     Naspers, dan Clicks, dan rugby — en 'n tweede keuse wat die eerste twee
     stil weggooi, is presies hoe jy 'n duimnael maak sonder om te weet dat jou
     verwysings weg is. */
  function voegVerwysingsBy(gekose: FileList | null) {
    const nuwes = Array.from(gekose ?? []);
    if (nuwes.length === 0) return;

    const geweier: string[] = [];
    setVerwysings((huidig) => {
      const uit = [...huidig];
      for (const lêer of nuwes) {
        if (lêer.type === "image/webp" || lêer.name.toLowerCase().endsWith(".webp")) {
          // Die roete weier WebP ook; ons sê dit hier sodat AP nie eers 'n
          // mislukte generasie moet afwag om dit te hoor nie.
          geweier.push(`${lêer.name} (WebP werk nie)`);
          continue;
        }
        if (uit.length >= MAKS_VERWYSINGS) {
          geweier.push(`${lêer.name} (hoogstens ${MAKS_VERWYSINGS})`);
          continue;
        }
        uit.push({ lêer, voorskou: URL.createObjectURL(lêer) });
      }
      return uit;
    });

    setBoodskap(geweier.length ? `Oorgeslaan: ${geweier.join(", ")}` : null);
  }

  // ---- die reaksie-biblioteek ----

  /* Die bediener gee die lys by die eerste render; daarna hou ons dit hier by
     sodat 'n oplaai of 'n verwydering dadelik wys sonder 'n herlaai. */
  async function laaiReaksieOp(lêer: File) {
    setBesig("Reaksie word uitgesny — dit vat 'n oomblik…");
    setBoodskap(null);
    const vorm = new FormData();
    vorm.append("leer", lêer);
    const res = await fetch("/api/duimnael/reaksie", { method: "POST", body: vorm });
    const data = await res.json().catch(() => ({}));
    setBesig(null);
    if (!res.ok) {
      setBoodskap(data.fout ?? "Die reaksie kon nie opgelaai word nie.");
      return;
    }
    setBiblioteek((huidig) => [...huidig, { naam: data.naam, url: data.url }]);
  }

  async function verwyderReaksie(r: Reaksie) {
    const res = await fetch(`/api/duimnael/reaksie?naam=${encodeURIComponent(r.naam)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBoodskap(data.fout ?? "Die reaksie kon nie verwyder word nie.");
      return;
    }
    setBiblioteek((huidig) => huidig.filter((x) => x.naam !== r.naam));
  }

  function verwyderVerwysing(i: number) {
    setVerwysings((huidig) => {
      const weg = huidig[i];
      if (weg) URL.revokeObjectURL(weg.voorskou);
      return huidig.filter((_, j) => j !== i);
    });
  }

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
    for (const v of verwysings) vorm.append("verwysing", v.lêer);
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
            spieël: false,
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
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        pointerEvents: "none",
                        // Dieselfde transform as die renderaar — anders lieg die voorskou.
                        ...(laag.soort === "reaksie" && laag.spieël
                          ? { transform: "scaleX(-1)" }
                          : {}),
                      }}
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
            {biblioteek.map((r) => (
              <div key={r.naam} className="relative">
                <button
                  type="button"
                  onClick={() => kiesReaksie(r)}
                  className="block w-full border-2 border-ink hover:bg-paper"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={r.naam} src={r.url} className="aspect-square w-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => verwyderReaksie(r)}
                  aria-label={`Verwyder ${r.naam}`}
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center border-2 border-ink bg-paper text-xs font-bold leading-none hover:bg-red hover:text-paper"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {biblioteek.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">Nog geen reaksies nie — laai een op.</p>
          ) : null}

          {/* Die roete sny die agtergrond met Replicate uit, so 'n gewone foto
              is genoeg — dit hoef nie vooraf uitgeknip te wees nie. */}
          <label
            className={`mt-2 block cursor-pointer border-2 border-ink px-3 py-1.5 text-center text-sm font-bold ${
              besig ? "cursor-not-allowed opacity-40" : "hover:bg-paper"
            }`}
          >
            + Laai &apos;n reaksie-skoot op
            <input
              type="file"
              accept="image/png,image/jpeg"
              disabled={besig !== null}
              onChange={(e) => {
                const lêer = e.target.files?.[0];
                e.target.value = "";
                if (lêer) laaiReaksieOp(lêer);
              }}
              className="hidden"
            />
          </label>
        </section>

        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide">2 · Agtergrond</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink/60">
            Laai vandag se onderwerpe op — die KI maak daaruit &apos;n agtergrond.
          </p>

          {verwysings.length > 0 ? (
            <ul className="mt-2 grid grid-cols-4 gap-2">
              {verwysings.map((v, i) => (
                <li key={v.voorskou} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={v.lêer.name}
                    title={v.lêer.name}
                    src={v.voorskou}
                    className="aspect-square w-full border-2 border-ink object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => verwyderVerwysing(i)}
                    aria-label={`Verwyder ${v.lêer.name}`}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center border-2 border-ink bg-paper text-xs font-bold leading-none hover:bg-red hover:text-paper"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {/* 'n <label> om 'n verborge invoer: die blaaier se eie kieser wys
              "Choose files — images (11).jpeg", wat nie soos die res van die
              werkruimte lyk nie en ook nie sê hoeveel jy al gekies het nie. */}
          <label
            className={`mt-2 block cursor-pointer border-2 border-ink px-3 py-1.5 text-center text-sm font-bold ${
              verwysings.length >= MAKS_VERWYSINGS
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-paper"
            }`}
          >
            {verwysings.length === 0
              ? "+ Kies verwysingsbeelde"
              : `+ Nog een (${verwysings.length}/${MAKS_VERWYSINGS})`}
            <input
              type="file"
              accept="image/png,image/jpeg"
              multiple
              disabled={verwysings.length >= MAKS_VERWYSINGS}
              onChange={(e) => {
                voegVerwysingsBy(e.target.files);
                // Maak die invoer skoon sodat dieselfde lêer weer gekies kan word.
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STYLE.map((s) => (
              <button
                key={s.sleutel}
                type="button"
                title={s.wat}
                onClick={() => setPrompt(s.prompt)}
                className={`border-2 border-ink px-2 py-1 text-xs font-bold ${
                  prompt === s.prompt ? "bg-ink text-paper" : "hover:bg-paper"
                }`}
              >
                {s.naam}
              </button>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="mt-2 w-full border-2 border-ink bg-offwhite p-2 text-xs"
          />
          <button
            onClick={genereerAgtergrond}
            disabled={besig !== null || verwysings.length === 0}
            className="mt-2 w-full border-2 border-ink bg-ink px-3 py-1.5 text-sm font-bold text-paper hover:bg-ink/85 disabled:bg-ink/30"
          >
            {verwysings.length === 0
              ? "Maak agtergrond"
              : `Maak agtergrond uit ${verwysings.length} ${verwysings.length === 1 ? "beeld" : "beelde"}`}
          </button>
          <p className="mt-1 text-xs text-ink/50">Vat 30–60s en kos geld per druk.</p>
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
                <button
                  type="button"
                  onClick={() =>
                    stelLaag(gekies!, (l) =>
                      l.soort === "reaksie" ? { ...l, spieël: !l.spieël } : l
                    )
                  }
                  className={`mt-3 w-full border-2 border-ink px-3 py-1.5 text-sm font-bold ${
                    gekose.spieël ? "bg-ink text-paper" : "hover:bg-paper"
                  }`}
                >
                  ⇄ Draai om {gekose.spieël ? "(aan)" : ""}
                </button>
                <p className="mt-1 text-xs text-ink/50">
                  Sit jy AP regs, laat dit hom die raam in kyk.
                </p>
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
