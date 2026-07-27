"use client";

import { useEffect, useRef, useState } from "react";
import type { Kwotasie } from "@/lib/markets/source";
import { naamVirSimbool } from "@/lib/markets/boards";

export type Belegging = { simbool: string; naam?: string; aantal: number; koopprys: number };

type SoekResultaat = { simbool: string; naam: string; beurs: string };

const SLEUTEL = "buitelyn-portefeulje";

export function Portefeulje({
  kwotasies,
  onVerander,
}: {
  kwotasies: Map<string, Kwotasie>;
  onVerander: (b: Belegging[]) => void;
}) {
  const [beleggings, setBeleggings] = useState<Belegging[]>([]);
  const [soek, setSoek] = useState("");
  const [resultate, setResultate] = useState<SoekResultaat[]>([]);
  const [gekose, setGekose] = useState<SoekResultaat | null>(null);
  const [aantal, setAantal] = useState("");
  const [koopprys, setKoopprys] = useState("");
  const soekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function soekTikker(q: string) {
    setSoek(q);
    setGekose(null);
    if (soekTimer.current) clearTimeout(soekTimer.current);
    if (q.trim().length < 2) {
      setResultate([]);
      return;
    }
    soekTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/markte/soek?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setResultate((await res.json()).resultate ?? []);
      } catch {
        /* stil */
      }
    }, 300);
  }

  function kies(r: SoekResultaat) {
    setGekose(r);
    setSoek(`${r.naam} (${r.simbool})`);
    setResultate([]);
  }

  function voegBy() {
    const a = parseFloat(aantal);
    const p = parseFloat(koopprys);
    // 'n Rou tikker soos "AAPL" of "SNT.JO" werk ook sonder om te kies
    const rou = soek.trim().toUpperCase();
    const keuse = gekose ?? (/^[A-Z0-9^][A-Z0-9.^=-]{0,11}$/.test(rou) ? { simbool: rou, naam: rou, beurs: "" } : null);
    if (!keuse || !a || !p) return;
    stoor([...beleggings, { simbool: keuse.simbool, naam: keuse.naam, aantal: a, koopprys: p }]);
    setSoek("");
    setGekose(null);
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
                  {r.naam ?? naamVirSimbool(r.simbool)}
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
        <div className="relative min-w-52 flex-1">
          <input
            value={soek}
            onChange={(e) => soekTikker(e.target.value)}
            placeholder="Soek aandeel of tikker (bv. Santam, AAPL)…"
            className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
          />
          {resultate.length > 0 ? (
            <ul className="absolute inset-x-0 top-full z-10 border-2 border-t-0 border-ink bg-offwhite">
              {resultate.map((r) => (
                <li key={r.simbool}>
                  <button
                    onClick={() => kies(r)}
                    className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-sm hover:bg-ink hover:text-offwhite"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.naam}</span>
                    <span className="text-xs tabular-nums opacity-60">{r.simbool}</span>
                    {r.beurs ? <span className="text-[10px] tracking-wide opacity-50">{r.beurs.toUpperCase()}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
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
