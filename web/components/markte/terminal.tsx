"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Kwotasie, ReeksPunt } from "@/lib/markets/source";
import { BORDE, naamVirSimbool } from "@/lib/markets/boards";
import { Portefeulje, type Belegging } from "@/components/markte/portefeulje";
import { MarkteChat } from "@/components/markte/chat";
import { NuusBord } from "@/components/markte/nuus";
import type { NuusItem } from "@/lib/markets/nuus";

const geldFmt = (geld: string) =>
  new Intl.NumberFormat("af-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function formatteerPrys(k: Kwotasie): string {
  const n = geldFmt(k.geldeenheid).format(k.prys);
  if (k.geldeenheid === "ZAR") return `R ${n}`;
  if (k.geldeenheid === "USD") return `$ ${n}`;
  if (k.geldeenheid === "GBP") return `£ ${n}`;
  if (k.geldeenheid === "JPY") return `¥ ${n}`;
  return n;
}

function Pyl({ op }: { op: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block"
      style={{
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        ...(op
          ? { borderBottom: "8px solid var(--brand-green)" }
          : { borderTop: "8px solid var(--brand-red)" }),
      }}
    />
  );
}

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

export function MarkteTerminal({ aanvanklik, nuus = [] }: { aanvanklik: Kwotasie[]; nuus?: NuusItem[] }) {
  const [kwotasies, setKwotasies] = useState<Kwotasie[]>(aanvanklik);
  const [oopRy, setOopRy] = useState<string | null>(null);
  const [reekse, setReekse] = useState<Record<string, ReeksPunt[]>>({});
  const [portefeulje, setPortefeulje] = useState<Belegging[]>([]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/markte/quotes");
        if (res.ok) setKwotasies((await res.json()).kwotasies);
      } catch {
        /* volgende keer weer */
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const kaart = useMemo(() => new Map(kwotasies.map((k) => [k.simbool, k])), [kwotasies]);

  const kliekRy = useCallback(
    async (simbool: string) => {
      setOopRy((huidig) => (huidig === simbool ? null : simbool));
      if (!reekse[simbool]) {
        try {
          const res = await fetch(`/api/markte/series?simbool=${encodeURIComponent(simbool)}`);
          if (res.ok) {
            const { reeks } = await res.json();
            setReekse((r) => ({ ...r, [simbool]: reeks }));
          }
        } catch {
          /* ignoreer */
        }
      }
    },
    [reekse]
  );

  const jseKwotasies = BORDE[0].items
    .map((i) => kaart.get(i.simbool))
    .filter((k): k is Kwotasie => Boolean(k));

  return (
    <div className="grid gap-8 xl:grid-cols-[3fr_2fr]">
      <div className="min-w-0">
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
            <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
              {bord.titel.toUpperCase()}
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
                        <p className="pt-2 text-[11px] tracking-[0.14em] text-ink/50">
                          AFGELOPE MAAND
                        </p>
                        {reekse[item.simbool] ? (
                          <Sparkline reeks={reekse[item.simbool]} />
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

        <NuusBord items={nuus} />

        <Omskakelaar usdZar={kaart.get("ZAR=X")?.prys ?? null} eurZar={kaart.get("EURZAR=X")?.prys ?? null} gbpZar={kaart.get("GBPZAR=X")?.prys ?? null} />

        <Portefeulje kwotasies={kaart} onVerander={setPortefeulje} />
      </div>

      <MarkteChat portefeulje={portefeulje} />
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
