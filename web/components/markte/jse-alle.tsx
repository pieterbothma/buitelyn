"use client";

import { useEffect, useState } from "react";
import type { Kwotasie } from "@/lib/markets/source";
import { bewegersNaam } from "@/lib/markets/boards";
import { formatteerPrys, Pyl } from "@/components/markte/format";

type Sorteer = "naam" | "delta";

/** "Sien meer"-knoppie op die JSE-bord: popup met die volle ~100-naam-universum. */
export function JseAlle() {
  const [oop, setOop] = useState(false);
  const [kwotasies, setKwotasies] = useState<Kwotasie[] | null>(null);
  const [soek, setSoek] = useState("");
  const [sorteer, setSorteer] = useState<Sorteer>("naam");

  useEffect(() => {
    if (!oop || kwotasies) return;
    fetch("/api/markte/jse")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setKwotasies(d?.kwotasies ?? []))
      .catch(() => setKwotasies([]));
  }, [oop, kwotasies]);

  useEffect(() => {
    if (!oop) return;
    const sluit = (e: KeyboardEvent) => e.key === "Escape" && setOop(false);
    document.addEventListener("keydown", sluit);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", sluit);
      document.body.style.overflow = "";
    };
  }, [oop]);

  const gefiltreer = (kwotasies ?? [])
    .filter((k) => {
      const q = soek.trim().toLowerCase();
      if (!q) return true;
      return (
        k.simbool.toLowerCase().includes(q) || bewegersNaam(k.simbool).toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      sorteer === "delta"
        ? (b.deltaPersent ?? -999) - (a.deltaPersent ?? -999)
        : bewegersNaam(a.simbool).localeCompare(bewegersNaam(b.simbool), "af")
    );

  return (
    <>
      <button
        onClick={() => setOop(true)}
        className="border border-ink/30 bg-paper px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-ink/70 hover:border-ink hover:bg-ink hover:text-offwhite"
      >
        Sien meer →
      </button>

      {oop ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOop(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col border-2 border-ink bg-offwhite"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
              <p className="text-xs font-semibold tracking-[0.16em]">
                DIE VOLLE JSE-BORD
                <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
              </p>
              <button
                onClick={() => setOop(false)}
                aria-label="Maak toe"
                className="px-2 text-lg font-bold hover:text-red"
              >
                ×
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-ink/15 px-4 py-2">
              <input
                value={soek}
                onChange={(e) => setSoek(e.target.value)}
                placeholder="Soek naam of tikker…"
                className="min-w-0 flex-1 border-2 border-ink bg-paper px-2 py-1 text-sm outline-none focus:border-red"
              />
              <div className="flex border border-ink/30">
                {(
                  [
                    { s: "naam", n: "A–Z" },
                    { s: "delta", n: "Δ%" },
                  ] as { s: Sorteer; n: string }[]
                ).map((o) => (
                  <button
                    key={o.s}
                    onClick={() => setSorteer(o.s)}
                    className={`px-2.5 py-1 text-xs font-semibold ${
                      sorteer === o.s ? "bg-ink text-offwhite" : "hover:bg-paper"
                    }`}
                  >
                    {o.n}
                  </button>
                ))}
              </div>
            </div>
            <ul className="divide-y divide-ink/10 overflow-y-auto">
              {kwotasies === null ? (
                <li className="px-4 py-6 text-sm text-ink/50">Laai die volle bord…</li>
              ) : gefiltreer.length === 0 ? (
                <li className="px-4 py-6 text-sm text-ink/50">Niks gevind nie.</li>
              ) : (
                gefiltreer.map((k) => {
                  const d = k.deltaPersent;
                  return (
                    <li key={k.simbool} className="flex items-baseline gap-3 px-4 py-2">
                      <span className="w-14 text-xs font-bold tracking-wide text-ink/60">
                        {k.simbool.replace(".JO", "")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {bewegersNaam(k.simbool)}
                      </span>
                      <span className="text-sm tabular-nums">{formatteerPrys(k)}</span>
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
                    </li>
                  );
                })
              )}
            </ul>
            <p className="border-t border-ink/15 px-4 py-2 text-xs text-ink/50">
              JSE-hoofname · data ±15 min vertraag
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
