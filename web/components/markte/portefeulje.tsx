"use client";

import { useEffect, useState } from "react";
import type { Kwotasie } from "@/lib/markets/source";
import { ALLE_SIMBOLE, naamVirSimbool } from "@/lib/markets/boards";

export type Belegging = { simbool: string; aantal: number; koopprys: number };

const SLEUTEL = "buitelyn-portefeulje";

export function Portefeulje({
  kwotasies,
  onVerander,
}: {
  kwotasies: Map<string, Kwotasie>;
  onVerander: (b: Belegging[]) => void;
}) {
  const [beleggings, setBeleggings] = useState<Belegging[]>([]);
  const [simbool, setSimbool] = useState(ALLE_SIMBOLE[1]);
  const [aantal, setAantal] = useState("");
  const [koopprys, setKoopprys] = useState("");

  useEffect(() => {
    try {
      const gestoor = JSON.parse(localStorage.getItem(SLEUTEL) ?? "[]");
      if (Array.isArray(gestoor)) {
        setBeleggings(gestoor);
        onVerander(gestoor);
      }
    } catch {
      /* korrupte data — begin oor */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stoor(nuut: Belegging[]) {
    setBeleggings(nuut);
    localStorage.setItem(SLEUTEL, JSON.stringify(nuut));
    onVerander(nuut);
  }

  function voegBy() {
    const a = parseFloat(aantal);
    const p = parseFloat(koopprys);
    if (!simbool || !a || !p) return;
    stoor([...beleggings, { simbool, aantal: a, koopprys: p }]);
    setAantal("");
    setKoopprys("");
  }

  const fmt = new Intl.NumberFormat("af-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let totaalWaarde = 0;
  let totaalKoste = 0;
  let dagDelta = 0;

  const rye = beleggings.map((b, i) => {
    const k = kwotasies.get(b.simbool);
    const waarde = k ? k.prys * b.aantal : null;
    if (waarde != null && k) {
      totaalWaarde += waarde;
      totaalKoste += b.koopprys * b.aantal;
      if (k.vorigeSluiting != null) dagDelta += (k.prys - k.vorigeSluiting) * b.aantal;
    }
    return { ...b, i, k, waarde };
  });
  const totaalPL = totaalWaarde - totaalKoste;

  return (
    <section className="border-2 border-ink bg-offwhite">
      <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        MY PORTEFEULJE
        <span className="ml-2 font-normal normal-case tracking-normal text-ink/50">
          (gestoor in jou blaaier)
        </span>
      </h2>

      {rye.length > 0 ? (
        <>
          <ul className="divide-y divide-ink/10">
            {rye.map((r) => (
              <li key={r.i} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {naamVirSimbool(r.simbool)}
                  <span className="ml-1.5 font-normal text-ink/50">× {r.aantal}</span>
                </span>
                <span className="font-bold tabular-nums">
                  {r.waarde != null ? `R ${fmt.format(r.waarde)}` : "—"}
                </span>
                {r.waarde != null ? (
                  <span
                    className={`w-28 text-right text-xs font-semibold tabular-nums ${
                      r.waarde - r.koopprys * r.aantal >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {r.waarde - r.koopprys * r.aantal >= 0 ? "+" : ""}
                    R {fmt.format(r.waarde - r.koopprys * r.aantal)}
                  </span>
                ) : (
                  <span className="w-28" />
                )}
                <button
                  onClick={() => stoor(beleggings.filter((_, j) => j !== r.i))}
                  className="text-xs font-semibold text-red/70 hover:text-red"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-baseline gap-4 border-t-2 border-ink px-4 py-2.5 text-sm">
            <span className="font-extrabold">TOTAAL R {fmt.format(totaalWaarde)}</span>
            <span
              className={`font-semibold tabular-nums ${dagDelta >= 0 ? "text-green" : "text-red"}`}
            >
              vandag {dagDelta >= 0 ? "+" : ""}R {fmt.format(dagDelta)}
            </span>
            <span
              className={`font-semibold tabular-nums ${totaalPL >= 0 ? "text-green" : "text-red"}`}
            >
              altesaam {totaalPL >= 0 ? "+" : ""}R {fmt.format(totaalPL)}
            </span>
          </div>
        </>
      ) : (
        <p className="px-4 py-4 text-sm text-ink/50">
          Voeg jou beleggings by — waardes en wins/verlies word live bereken.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 px-4 py-3">
        <select
          value={simbool}
          onChange={(e) => setSimbool(e.target.value)}
          className="border-2 border-ink bg-paper px-2 py-1.5 text-sm"
        >
          {ALLE_SIMBOLE.map((s) => (
            <option key={s} value={s}>
              {naamVirSimbool(s)}
            </option>
          ))}
        </select>
        <input
          value={aantal}
          onChange={(e) => setAantal(e.target.value)}
          placeholder="Aantal"
          className="w-24 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
        />
        <input
          value={koopprys}
          onChange={(e) => setKoopprys(e.target.value)}
          placeholder="Koopprys (R)"
          className="w-32 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
        />
        <button
          onClick={voegBy}
          className="bg-ink px-4 py-1.5 text-sm font-semibold text-offwhite hover:bg-ink/85"
        >
          + Voeg by
        </button>
      </div>
    </section>
  );
}
