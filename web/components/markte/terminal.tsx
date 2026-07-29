"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
// (vraChat stuur konteks-vrae vanaf borde/nuus na die chat-paneel)
import type { Kwotasie, ReeksPunt } from "@/lib/markets/source";
import { ALLE_SIMBOLE, BORDE, naamVirSimbool } from "@/lib/markets/boards";
import { Portefeulje, type Belegging } from "@/components/markte/portefeulje";
import { MarkteChat } from "@/components/markte/chat";
import { NuusBord } from "@/components/markte/nuus";
import { HouMyDop } from "@/components/markte/dophou";
import { JseAlle } from "@/components/markte/jse-alle";
import { formatteerPrys, Pyl } from "@/components/markte/format";
import type { NuusItem } from "@/lib/markets/nuus";

function Sparkline({ reeks }: { reeks: ReeksPunt[] }) {
  if (reeks.length < 2) return <p className="py-4 text-xs text-ink/50">Geen reeksdata nie.</p>;
  const w = 560;
  const h = 96;
  const min = Math.min(...reeks.map((r) => r.p));
  const max = Math.max(...reeks.map((r) => r.p));
  const span = max - min || 1;
  const pts = reeks
    .map((r, i) => `${(i / (reeks.length - 1)) * w},${h - ((r.p - min) / span) * (h - 8) - 4}`)
    .join(" ");
  const op = reeks[reeks.length - 1].p >= reeks[0].p;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-24 w-full">
      <polyline
        points={pts}
        fill="none"
        stroke={op ? "var(--brand-green)" : "var(--brand-red)"}
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function MarkteTerminal({
  aanvanklik,
  nuus = [],
  aanvangVraag = null,
}: {
  aanvanklik: Kwotasie[];
  nuus?: NuusItem[];
  aanvangVraag?: string | null;
}) {
  const [kwotasies, setKwotasies] = useState<Kwotasie[]>(aanvanklik);
  const [oopRy, setOopRy] = useState<string | null>(null);
  const [ryReeks, setRyReeks] = useState<Record<string, string>>({});
  const [reekse, setReekse] = useState<Record<string, ReeksPunt[]>>({});
  const [portefeulje, setPortefeulje] = useState<Belegging[]>([]);
  const [dophouSimbole, setDophouSimbole] = useState<string[]>([]);
  const [eksterneVraag, setEksterneVraag] = useState<{ id: number; teks: string } | null>(null);

  const vraChat = useCallback((teks: string) => {
    setEksterneVraag({ id: Date.now(), teks });
  }, []);

  // ?vra=-diepskakel (bv. vanaf die Portefeulje-oortjie) laai die chat dadelik
  useEffect(() => {
    if (aanvangVraag) setEksterneVraag({ id: Date.now(), teks: aanvangVraag });
  }, [aanvangVraag]);

  /* Portfolio holdings outside the boards ride along as ?ekstra=; a change
     (new custom holding) refetches immediately instead of waiting a minute. */
  const ekstraCsv = [...new Set([...portefeulje.map((b) => b.simbool), ...dophouSimbole])]
    .filter((s) => !ALLE_SIMBOLE.includes(s))
    .sort()
    .join(",");

  useEffect(() => {
    const url = ekstraCsv ? `/api/markte/quotes?ekstra=${encodeURIComponent(ekstraCsv)}` : "/api/markte/quotes";
    const haal = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const nuwe = (await res.json()).kwotasies as Kwotasie[];
          // voeg oor die oues: 'n simbool wat een haal mis (Yahoo-hik) hou sy laaste prys
          setKwotasies((oud) => {
            const kaart = new Map(oud.map((k) => [k.simbool, k]));
            for (const k of nuwe) kaart.set(k.simbool, k);
            return [...kaart.values()];
          });
        }
      } catch {
        /* volgende keer weer */
      }
    };
    if (ekstraCsv) haal();
    const id = setInterval(haal, 60_000);
    return () => clearInterval(id);
  }, [ekstraCsv]);

  const kaart = useMemo(() => new Map(kwotasies.map((k) => [k.simbool, k])), [kwotasies]);

  const laaiReeks = useCallback(
    async (simbool: string, range: string) => {
      const sleutel = `${simbool}:${range}`;
      if (reekse[sleutel]) return;
      try {
        const res = await fetch(
          `/api/markte/series?simbool=${encodeURIComponent(simbool)}&reeks=${range}`
        );
        if (res.ok) {
          const { reeks } = await res.json();
          setReekse((r) => ({ ...r, [sleutel]: reeks }));
        }
      } catch {
        /* ignoreer */
      }
    },
    [reekse]
  );

  const kliekRy = useCallback(
    (simbool: string) => {
      setOopRy((huidig) => (huidig === simbool ? null : simbool));
      laaiReeks(simbool, ryReeks[simbool] ?? "1mo");
    },
    [laaiReeks, ryReeks]
  );

  const jseKwotasies = BORDE[0].items
    .map((i) => kaart.get(i.simbool))
    .filter((k): k is Kwotasie => Boolean(k));

  return (
    <div className="grid gap-8 xl:grid-cols-[3fr_2fr]">
      <div className="min-w-0">
        <div className="mb-6">
          <Portefeulje kwotasies={kaart} onVerander={setPortefeulje} />
        </div>

        <HouMyDop kwotasies={kaart} onVerander={setDophouSimbole} />

        {/* Hittekaart-strook: JSE Δ% as gekleurde blokkies */}
        {jseKwotasies.length > 0 ? (
          <div className="mb-6 flex overflow-hidden border-2 border-ink">
            {jseKwotasies.map((k) => {
              const d = k.deltaPersent ?? 0;
              const intensiteit = Math.min(Math.abs(d) / 3, 1);
              const kleur =
                d >= 0
                  ? `rgba(14,131,69,${0.15 + intensiteit * 0.85})`
                  : `rgba(240,48,40,${0.15 + intensiteit * 0.85})`;
              return (
                <div
                  key={k.simbool}
                  title={`${naamVirSimbool(k.simbool)} ${d.toFixed(2)}%`}
                  className="flex h-9 flex-1 items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: kleur, color: intensiteit > 0.45 ? "#F7F6F2" : "#1A1A1A" }}
                >
                  {k.simbool.replace(".JO", "")}
                </div>
              );
            })}
          </div>
        ) : null}

        {BORDE.map((bord) => (
          <section key={bord.titel} className="mb-6 border-2 border-ink bg-offwhite">
            <h2 className="flex items-center justify-between border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
              {bord.titel.toUpperCase()}
              {bord.titel === "JSE" ? <JseAlle /> : null}
            </h2>
            <ul className="divide-y divide-ink/10">
              {bord.items.map((item) => {
                const k = kaart.get(item.simbool);
                const d = k?.deltaPersent ?? null;
                const oop = oopRy === item.simbool;
                return (
                  <li key={item.simbool}>
                    <button
                      onClick={() => kliekRy(item.simbool)}
                      className="flex w-full items-baseline gap-3 px-4 py-2 text-left hover:bg-paper"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {item.naam}
                      </span>
                      {k ? (
                        <>
                          <span className="text-sm font-bold tabular-nums">
                            {formatteerPrys(k)}
                          </span>
                          {d != null ? (
                            <span
                              className={`flex w-24 items-center justify-end gap-1.5 text-sm font-semibold tabular-nums ${
                                d >= 0 ? "text-green" : "text-red"
                              }`}
                            >
                              <Pyl op={d >= 0} />
                              {d >= 0 ? "+" : ""}
                              {d.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="w-24" />
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-ink/40">—</span>
                      )}
                    </button>
                    {oop ? (
                      <div className="border-t border-ink/10 px-4 pb-3">
                        <p className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] tracking-[0.14em] text-ink/50">
                          <span className="flex items-center gap-2">
                            <span className="flex border border-ink/30">
                              {[
                                { w: "1d", n: "1D" },
                                { w: "1mo", n: "1M" },
                                { w: "1y", n: "1J" },
                              ].map((r) => {
                                const aktief = (ryReeks[item.simbool] ?? "1mo") === r.w;
                                return (
                                  <button
                                    key={r.w}
                                    onClick={() => {
                                      setRyReeks((v) => ({ ...v, [item.simbool]: r.w }));
                                      laaiReeks(item.simbool, r.w);
                                    }}
                                    className={`px-2 py-0.5 text-[11px] font-semibold tracking-normal ${
                                      aktief ? "bg-ink text-offwhite" : "hover:bg-paper"
                                    }`}
                                  >
                                    {r.n}
                                  </button>
                                );
                              })}
                            </span>
                            {(ryReeks[item.simbool] ?? "1mo") === "1d"
                              ? "VANDAG"
                              : (ryReeks[item.simbool] ?? "1mo") === "1y"
                                ? "AFGELOPE JAAR"
                                : "AFGELOPE MAAND"}
                          </span>
                          <button
                            onClick={() =>
                              vraChat(`Wat gaan aan met ${item.naam} (${item.simbool}) — hoe lyk vandag en die afgelope maand?`)
                            }
                            className="border border-ink/30 bg-paper px-2 py-1 text-xs font-semibold normal-case tracking-normal text-ink/70 hover:border-ink hover:bg-ink hover:text-offwhite"
                          >
                            Vra Buitelyn oor {item.naam} →
                          </button>
                        </p>
                        {reekse[`${item.simbool}:${ryReeks[item.simbool] ?? "1mo"}`] ? (
                          <Sparkline reeks={reekse[`${item.simbool}:${ryReeks[item.simbool] ?? "1mo"}`]} />
                        ) : (
                          <p className="py-4 text-xs text-ink/50">Laai…</p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <NuusBord items={nuus} onVra={vraChat} />

        <Omskakelaar usdZar={kaart.get("ZAR=X")?.prys ?? null} eurZar={kaart.get("EURZAR=X")?.prys ?? null} gbpZar={kaart.get("GBPZAR=X")?.prys ?? null} />
      </div>

      <MarkteChat portefeulje={portefeulje} eksterneVraag={eksterneVraag} />
    </div>
  );
}

function Omskakelaar({
  usdZar,
  eurZar,
  gbpZar,
}: {
  usdZar: number | null;
  eurZar: number | null;
  gbpZar: number | null;
}) {
  const [bedrag, setBedrag] = useState("1000");
  const n = parseFloat(bedrag) || 0;
  const fmt = new Intl.NumberFormat("af-ZA", { maximumFractionDigits: 2 });
  return (
    <section className="mb-6 border-2 border-ink bg-offwhite">
      <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        OMSKAKELAAR
      </h2>
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
        <label className="flex items-center gap-2 font-semibold">
          R
          <input
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
            className="w-28 border-2 border-ink bg-paper px-2 py-1 tabular-nums outline-none focus:border-red"
          />
        </label>
        <span className="tabular-nums">= $ {usdZar ? fmt.format(n / usdZar) : "—"}</span>
        <span className="tabular-nums">= € {eurZar ? fmt.format(n / eurZar) : "—"}</span>
        <span className="tabular-nums">= £ {gbpZar ? fmt.format(n / gbpZar) : "—"}</span>
      </div>
    </section>
  );
}
