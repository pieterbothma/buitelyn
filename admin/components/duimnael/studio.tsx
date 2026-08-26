"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gloedKas, gloedSvgUrl } from "@/lib/duimnael/gloed";
import { laagKas } from "@/lib/duimnael/laag";
import {
  GLOED_VERSTEK,
  RAAM,
  STYLE,
  OMLYN_MAKS,
  OMLYN_MIN,
  OMLYN_VERSTEK,
  TEKS_KLEURE,
  bouPrompt,
  type Kant,
  teksHex,
  teksOmlyn,
  teksSkaduwee,
  type Duimnael,
  type Laag,
} from "@/lib/duimnael/spec";
import { ROOI } from "@/lib/kaart/tokens";
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
  const [styl, setStyl] = useState<string>(STYLE[0].sleutel);
  const [kant, setKant] = useState<Kant>("links");
  const [onderwerpe, setOnderwerpe] = useState("");
  const [gevorderd, setGevorderd] = useState(false);

  /* Styl en kant bou saam die prompt. Die teksblok bly vryevorm — 'n eie
     wysiging bly staan totdat 'n knoppie weer gedruk word. */
  function stelStyl(sleutel: string, k: Kant) {
    const s = STYLE.find((x) => x.sleutel === sleutel) ?? STYLE[0];
    setStyl(s.sleutel);
    setKant(k);
    setPrompt(bouPrompt(s, k));
    /* By 'n vrye styl is die teksblok die ENIGSTE plek waar iets staan — hou dit
       toe en die paneel lyk stukkend. */
    if (s.vry) setGevorderd(true);
  }

  const vryeStyl = STYLE.find((x) => x.sleutel === styl)?.vry === true;

  /* Wys die agtergrond-afdeling en maak die prompt oop. Van die knoppie onder
     die voorskou af — dis waar AP is wanneer hy na 'n render besluit die
     agtergrond moet anders. */
  function wysigAgtergrond() {
    /* Blaai en oopmaak is albei niks-doeners as die afdeling reeds sigbaar en
       oop is — en dan lyk die knoppie stukkend presies wanneer AP dit druk.
       Ons plaas dus die wyser in die teksblok: dit gebeur altyd, en dis waar
       hy in elk geval wil wees. */
    setGevorderd(true);
    agtergrondRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Ná die herrender, anders bestaan die teksblok nog nie.
    requestAnimationFrame(() => {
      const t = promptRef.current;
      if (!t) return;
      t.focus();
      t.setSelectionRange(t.value.length, t.value.length);
    });
  }
  const [biblioteek, setBiblioteek] = useState<Reaksie[]>(reaksies);
  const [verwysings, setVerwysings] = useState<Verwysing[]>([]);
  const [besig, setBesig] = useState<string | null>(null);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [gekies, setGekies] = useState<number | null>(null);
  const [sleepBron, setSleepBron] = useState<number | null>(null);
  const raamRef = useRef<HTMLDivElement>(null);
  const agtergrondRef = useRef<HTMLHeadingElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

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

  /* Sleep die regterrand van 'n teksblok om te kies waar die woorde omvou.
     Dieselfde patroon as die laag-sleep: ons skryf net 'n getal op die spec en
     laagKas doen die res, so die voorskou en satori bly saam. */
  const sleepBreedte = useCallback(
    (i: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const raam = raamRef.current;
      if (!raam) return;
      const kas = raam.getBoundingClientRect();
      const beweeg = (ev: PointerEvent) => {
        const x = (ev.clientX - kas.left) / kas.width;
        stelLaag(i, (l) => {
          if (l.soort !== "teks") return l;
          const anker = l.plek.x;
          const rou =
            l.belyn === "links" ? x - anker : l.belyn === "regs" ? anker - x : (x - anker) * 2;
          return { ...l, breedte: Math.min(1, Math.max(0.05, rou)) };
        });
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

  /* Die render-volgorde IS die skikking-volgorde: indeks 0 word eerste geteken
     en is dus heel agter. Die lys hieronder wys dit omgekeerd — boaan die lys
     is boaan die duimnael — want dis hoe 'n mens aan lae dink. */
  function skuifLaag(van: number, na: number) {
    if (van === na) return;
    setDuimnael((d) => {
      const lae = [...d.lae];
      const [item] = lae.splice(van, 1);
      lae.splice(na, 0, item);
      return { ...d, lae };
    });
    // Die keuse volg die laag, nie die indeks nie.
    setGekies(na);
  }

  function laagNaam(l: Laag): string {
    if (l.soort === "reaksie") return "AP";
    if (l.soort === "logo") return `Logo (${l.kleur === "wit" ? "wit" : "swart"})`;
    return l.teks.length > 26 ? `${l.teks.slice(0, 26)}…` : l.teks;
  }

  /* Delete of Backspace verwyder die gekose laag. Die knoppie onderaan die
     paneel is intussen ver onder die vou — die paneel het baie langer geword. */
  useEffect(() => {
    function tik(e: KeyboardEvent) {
      if (gekies === null) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      // Nie terwyl iemand in 'n veld tik nie.
      const tikVeld =
        t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      if (tikVeld) return;
      e.preventDefault();
      verwyderLaag(gekies);
    }
    window.addEventListener("keydown", tik);
    return () => window.removeEventListener("keydown", tik);
  });

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
    if (verwysings.length === 0 && !onderwerpe.trim()) {
      setBoodskap("Laai 'n verwysingsbeeld op óf tik die onderwerpe.");
      return;
    }
    setBesig("Agtergrond word gemaak — dit vat 30-60s…");
    setBoodskap(null);
    const vorm = new FormData();
    vorm.append("prompt", prompt);
    if (onderwerpe.trim()) vorm.append("onderwerpe", onderwerpe.trim());
    for (const v of verwysings) vorm.append("verwysing", v.lêer);
    const res = await fetch("/api/duimnael/agtergrond", { method: "POST", body: vorm });
    const data = await res.json();
    setBesig(null);
    if (!res.ok) {
      setBoodskap(data.fout ?? "Die agtergrond kon nie gemaak word nie.");
      return;
    }
    if (data.onderwerpe) setOnderwerpe(data.onderwerpe);
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
        {
          soort: "teks",
          teks: "NUWE TEKS",
          kleur: "wit",
          omlyn: "geen",
          omlynDikte: OMLYN_VERSTEK,
          belyn: "links",
          breedte: 0.45,
          plek: { x: 0.5, y: 0.12, grootte: 0.09 },
        },
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
                    // Teks het geen bekende hoogte nie; gee dit darem 'n
                    // trefarea sodat dit maklik gekies kan word.
                    minHeight: k.height ? undefined : (k.fontSize ?? 16) * skaal,
                    cursor: "grab",
                    outline: gekies === i ? `2px solid ${ROOI}` : "none",
                  }}
                >
                  {gekies === i ? (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => verwyderLaag(i)}
                      title="Verwyder hierdie laag"
                      aria-label="Verwyder hierdie laag"
                      style={{
                        position: "absolute",
                        top: -12,
                        left: -12,
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #1A1A1A",
                        background: "#F7F6F2",
                        color: "#1A1A1A",
                        fontWeight: 700,
                        lineHeight: 1,
                        cursor: "pointer",
                        zIndex: 5,
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                  {laag.soort === "teks" && gekies === i ? (
                    <div
                      onPointerDown={sleepBreedte(i)}
                      title="Sleep om die blok smaller of wyer te maak"
                      style={{
                        position: "absolute",
                        top: 0,
                        right: -6,
                        width: 12,
                        height: "100%",
                        cursor: "ew-resize",
                        background: ROOI,
                        opacity: 0.9,
                      }}
                    />
                  ) : null}
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
                        color: teksHex(laag.kleur),
                        textAlign: laag.belyn === "middel" ? "center" : laag.belyn === "regs" ? "right" : "left",
                        textShadow: teksSkaduwee(laag.kleur),
                        ...(teksOmlyn(laag.omlyn, k.fontSize! * skaal, laag.omlynDikte)
                          ? {
                              WebkitTextStroke: teksOmlyn(
                                laag.omlyn,
                                k.fontSize! * skaal,
                                laag.omlynDikte
                              ),
                            }
                          : {}),
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
          <button
            onClick={wysigAgtergrond}
            className="border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper"
          >
            ⟳ Wysig agtergrond
          </button>
          <button onClick={laaiAf} className="border-2 border-ink bg-ink px-3 py-1.5 text-sm font-bold text-paper">
            Laai af (1280×720)
          </button>
        </div>

        {duimnael.lae.length > 0 ? (
          <section className="mt-6 max-w-md">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Lae</h2>
            <p className="mt-1 text-xs text-ink/60">
              Boaan die lys is boaan die duimnael. Sleep om te herrangskik.
            </p>
            <ul className="mt-2 space-y-1">
              {duimnael.lae
                .map((laag, i) => ({ laag, i }))
                .reverse()
                .map(({ laag, i }) => (
                  <li
                    key={i}
                    draggable
                    onDragStart={() => setSleepBron(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (sleepBron !== null) skuifLaag(sleepBron, i);
                      setSleepBron(null);
                    }}
                    onDragEnd={() => setSleepBron(null)}
                    onClick={() => setGekies(i)}
                    className={`flex cursor-grab items-center gap-2 border-2 px-2 py-1.5 text-sm ${
                      gekies === i ? "border-red bg-paper font-bold" : "border-ink hover:bg-paper"
                    } ${sleepBron === i ? "opacity-40" : ""}`}
                  >
                    <span aria-hidden className="text-ink/40">
                      ⠿
                    </span>
                    <span className="flex-1 truncate">{laagNaam(laag)}</span>
                    <button
                      type="button"
                      title="Skuif vorentoe"
                      aria-label="Skuif vorentoe"
                      onClick={(e) => {
                        e.stopPropagation();
                        skuifLaag(i, Math.min(duimnael.lae.length - 1, i + 1));
                      }}
                      disabled={i === duimnael.lae.length - 1}
                      className="px-1 font-bold disabled:opacity-25"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Skuif agtertoe"
                      aria-label="Skuif agtertoe"
                      onClick={(e) => {
                        e.stopPropagation();
                        skuifLaag(i, Math.max(0, i - 1));
                      }}
                      disabled={i === 0}
                      className="px-1 font-bold disabled:opacity-25"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      title="Verwyder"
                      aria-label="Verwyder"
                      onClick={(e) => {
                        e.stopPropagation();
                        verwyderLaag(i);
                      }}
                      className="px-1 font-bold hover:text-red"
                    >
                      ×
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
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
          <h2 ref={agtergrondRef} className="text-sm font-extrabold uppercase tracking-wide">
            2 · Agtergrond
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink/60">
            Laai vandag se onderwerpe op, óf tik hulle net hieronder — albei werk.
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
                onClick={() => stelStyl(s.sleutel, kant)}
                className={`border-2 border-ink px-2 py-1 text-xs font-bold ${
                  styl === s.sleutel ? "bg-ink text-paper" : "hover:bg-paper"
                }`}
              >
                {s.naam}
              </button>
            ))}
          </div>

          {/* Waar AP sit, moet die KI weet — anders hou dit die verkeerde kant
              oop en die interessante deel beland agter sy kop. */}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs font-bold uppercase ${vryeStyl ? "text-ink/30" : "text-ink/60"}`}>
              AP sit
            </span>
            {(["links", "regs"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => stelStyl(styl, k)}
                disabled={vryeStyl}
                title={vryeStyl ? "Geld nie by 'n vrye prompt nie" : undefined}
                className={`border-2 border-ink px-2 py-1 text-xs font-bold ${
                  vryeStyl ? "opacity-30" : kant === k ? "bg-ink text-paper" : "hover:bg-paper"
                }`}
              >
                {k === "links" ? "◧ Links" : "◨ Regs"}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs font-bold uppercase">Onderwerpe</label>
          <input
            type="text"
            value={onderwerpe}
            onChange={(e) => setOnderwerpe(e.target.value)}
            placeholder="Los leeg — die KI lees dit uit die beelde"
            className="mt-1 w-full border-2 border-ink bg-offwhite px-2 py-1.5 text-sm"
          />
          <p className="mt-1 text-xs text-ink/50">
            Bv. &quot;Naspers, Clicks, rugby&quot;. Tik dit self as die KI dit verkeerd lees.
          </p>

          {/* Die volle prompt is 'n stylgids, nie 'n kontrole nie. Dit sit weg
              agter Gevorderd sodat die paneel wys wat AP werklik verstel. */}
          <button
            type="button"
            onClick={() => setGevorderd((g) => !g)}
            className="mt-2 text-xs font-bold underline hover:no-underline"
          >
            {vryeStyl
              ? gevorderd
                ? "Versteek die prompt"
                : "Wys die prompt"
              : gevorderd
                ? "Versteek die stylreëls"
                : "Wys die stylreëls"}
          </button>
          {gevorderd ? (
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              placeholder={vryeStyl ? "Skryf die hele prompt self — geen reëls word bygevoeg nie." : undefined}
              className="mt-2 w-full border-2 border-ink bg-offwhite p-2 text-[11px] leading-snug"
            />
          ) : null}
          <button
            onClick={genereerAgtergrond}
            disabled={besig !== null || (verwysings.length === 0 && !onderwerpe.trim())}
            className="mt-2 w-full border-2 border-ink bg-ink px-3 py-1.5 text-sm font-bold text-paper hover:bg-ink/85 disabled:bg-ink/30"
          >
            {verwysings.length === 0
              ? "Maak agtergrond uit die onderwerpe"
              : `Maak agtergrond uit ${verwysings.length} ${verwysings.length === 1 ? "beeld" : "beelde"}`}
          </button>
          <p className="mt-1 text-xs text-ink/50">Vat 30–60s en kos geld per druk.</p>
          {duimnael.agtergrond ? (
            <button
              type="button"
              onClick={() => setDuimnael((d) => ({ ...d, agtergrond: null }))}
              className="mt-2 w-full border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper"
            >
              × Verwyder agtergrond
            </button>
          ) : null}
        </section>

        {!gekose ? (
          <section>
            <h2 className="text-sm font-extrabold uppercase tracking-wide">3 · Gekose laag</h2>
            <p className="mt-2 text-sm text-ink/60">
              Klik op AP, die teks of die logo in die voorskou om dit te verstel — omdraai, kleur,
              omlyning, grootte.
            </p>
          </section>
        ) : null}
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

                <label className="mt-3 block text-xs font-bold uppercase">Kleur</label>
                <div className="mt-1 flex gap-1.5">
                  {TEKS_KLEURE.map((k) => (
                    <button
                      key={k.sleutel}
                      type="button"
                      title={k.naam}
                      aria-label={k.naam}
                      onClick={() =>
                        stelLaag(gekies!, (l) =>
                          l.soort === "teks" ? { ...l, kleur: k.sleutel } : l
                        )
                      }
                      className={`size-7 border-2 ${
                        gekose.kleur === k.sleutel ? "border-red" : "border-ink"
                      }`}
                      style={{ backgroundColor: k.hex }}
                    />
                  ))}
                </div>

                <label className="mt-3 block text-xs font-bold uppercase">Omlyning</label>
                <div className="mt-1 flex gap-1.5">
                  <button
                    type="button"
                    title="Geen omlyning"
                    onClick={() =>
                      stelLaag(gekies!, (l) => (l.soort === "teks" ? { ...l, omlyn: "geen" } : l))
                    }
                    className={`flex size-7 items-center justify-center border-2 text-xs font-bold ${
                      gekose.omlyn === "geen" ? "border-red" : "border-ink"
                    }`}
                  >
                    ∅
                  </button>
                  {TEKS_KLEURE.map((k) => (
                    <button
                      key={k.sleutel}
                      type="button"
                      title={`Omlyn in ${k.naam}`}
                      aria-label={`Omlyn in ${k.naam}`}
                      onClick={() =>
                        stelLaag(gekies!, (l) =>
                          l.soort === "teks" ? { ...l, omlyn: k.sleutel } : l
                        )
                      }
                      className={`size-7 border-2 ${
                        gekose.omlyn === k.sleutel ? "border-red" : "border-ink"
                      }`}
                      style={{ backgroundColor: k.hex }}
                    />
                  ))}
                </div>

                {gekose.omlyn !== "geen" ? (
                  <>
                    <label className="mt-3 block text-xs font-bold uppercase">
                      Omlyn-dikte
                    </label>
                    <input
                      type="range"
                      min={OMLYN_MIN}
                      max={OMLYN_MAKS}
                      step={0.005}
                      value={gekose.omlynDikte}
                      onChange={(e) =>
                        stelLaag(gekies!, (l) =>
                          l.soort === "teks"
                            ? { ...l, omlynDikte: Number(e.target.value) }
                            : l
                        )
                      }
                      className="w-full"
                    />
                  </>
                ) : null}

                <label className="mt-3 block text-xs font-bold uppercase">Blok-breedte</label>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={gekose.breedte}
                  onChange={(e) =>
                    stelLaag(gekies!, (l) =>
                      l.soort === "teks" ? { ...l, breedte: Number(e.target.value) } : l
                    )
                  }
                  className="w-full"
                />
                <p className="mt-1 text-xs text-ink/50">
                  Of sleep die rooi handvatsel langs die blok in die voorskou.
                </p>
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
                  onClick={() => {
                    stelLaag(gekies!, (l) =>
                      l.soort === "reaksie" ? { ...l, spieël: !l.spieël } : l
                    );
                    /* Draai jy hom om, sit hy amper altyd aan die ander kant.
                       Die prompt volg saam sodat die KI die regte kant oophou. */
                    stelStyl(styl, gekose.plek.x < 0.5 ? "links" : "regs");
                  }}
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
