"use client";

import { useEffect, useState } from "react";
import type { ReeksPunt } from "@/lib/markets/source";

const REEKSE = [
  { w: "1d", n: "1D" },
  { w: "1mo", n: "1M" },
  { w: "6mo", n: "6M" },
  { w: "1y", n: "1J" },
  { w: "5y", n: "5J" },
] as const;

/** Publieke aandeelblad-grafiek: begin met die bediener-gestuurde 1J-reeks
 *  (Google sien 'n volledige blad), wissel klient-kant tussen tydperke. */
export function AandeelGrafiek({ simbool, aanvanklik }: { simbool: string; aanvanklik: ReeksPunt[] }) {
  const [range, setRange] = useState<(typeof REEKSE)[number]["w"]>("1y");
  const [reekse, setReekse] = useState<Record<string, ReeksPunt[]>>({ "1y": aanvanklik });

  useEffect(() => {
    if (reekse[range]) return;
    let aktief = true;
    fetch(`/api/markte/series?simbool=${encodeURIComponent(simbool)}&reeks=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (aktief && d?.reeks) setReekse((v) => ({ ...v, [range]: d.reeks }));
      })
      .catch(() => {});
    return () => {
      aktief = false;
    };
  }, [range, simbool, reekse]);

  const reeks = reekse[range] ?? [];
  const w = 720;
  const h = 220;
  const min = reeks.length ? Math.min(...reeks.map((r) => r.p)) : 0;
  const maks = reeks.length ? Math.max(...reeks.map((r) => r.p)) : 1;
  const span = maks - min || 1;
  const op = reeks.length > 1 && reeks[reeks.length - 1].p >= reeks[0].p;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex border border-ink/30">
          {REEKSE.map((r) => (
            <button
              key={r.w}
              onClick={() => setRange(r.w)}
              className={`px-2.5 py-1 text-xs font-semibold ${range === r.w ? "bg-ink text-offwhite" : "hover:bg-paper"}`}
            >
              {r.n}
            </button>
          ))}
        </span>
        {reeks.length > 1 ? (
          <span className={`text-sm font-bold tabular-nums ${op ? "text-green" : "text-red"}`}>
            {op ? "+" : ""}
            {(((reeks[reeks.length - 1].p - reeks[0].p) / reeks[0].p) * 100).toFixed(2)}% oor dié tydperk
          </span>
        ) : null}
      </div>
      {reeks.length > 1 ? (
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full">
          <polyline
            points={reeks.map((r, i) => `${(i / (reeks.length - 1)) * w},${h - ((r.p - min) / span) * (h - 12) - 6}`).join(" ")}
            fill="none"
            stroke={op ? "var(--brand-green)" : "var(--brand-red)"}
            strokeWidth="2.5"
          />
        </svg>
      ) : (
        <p className="py-8 text-sm text-ink/50">Laai die grafiek…</p>
      )}
    </div>
  );
}
