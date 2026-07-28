"use client";

import { useMemo, useRef, useState } from "react";
import { soekTikkers, type TikkerTreffer } from "@/app/actions-grafiek";

const KLEURE = ["#F03028", "#1A1A1A", "#3E7C6F", "#B0736F", "#8A6FB0", "#C08A2D"];
const TIPES = [
  { w: "vergelyking", n: "Vergelyking (%)" },
  { w: "enkel", n: "Enkel-lyn (prys)" },
  { w: "staaf", n: "Staafgrafiek" },
] as const;
const REEKSE = [
  { w: "1mo", n: "1M" },
  { w: "6mo", n: "6M" },
  { w: "ytd", n: "YTD" },
  { w: "1y", n: "1J" },
  { w: "5y", n: "5J" },
  { w: "max", n: "MAX" },
] as const;

type Chip = { simbool: string; naam: string };

export function GrafiekStudio() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [soek, setSoek] = useState("");
  const [treffers, setTreffers] = useState<TikkerTreffer[]>([]);
  const [tipe, setTipe] = useState<string>("vergelyking");
  const [reeks, setReeks] = useState<string>("1y");
  const [raam, setRaam] = useState<"poskaart" | "kaal">("poskaart");
  const [opskrif, setOpskrif] = useState("");
  const [subtitel, setSubtitel] = useState("");
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [stoorBesig, setStoorBesig] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function soekTik(q: string) {
    setSoek(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setTreffers([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setTreffers(await soekTikkers(q));
    }, 300);
  }

  function voegBy(t: { simbool: string; naam: string }) {
    setSoek("");
    setTreffers([]);
    if (chips.some((c) => c.simbool === t.simbool) || chips.length >= 6) return;
    setChips([...chips, { simbool: t.simbool, naam: t.naam }]);
  }

  const url = useMemo(() => {
    if (!chips.length) return null;
    const simbole = chips.map((c) => `${c.simbool}:${c.naam !== c.simbool ? c.naam : ""}`).join(",");
    const q = new URLSearchParams({ tipe, reeks, raam, simbole });
    if (opskrif.trim()) q.set("opskrif", opskrif.trim());
    if (subtitel.trim()) q.set("subtitel", subtitel.trim());
    return `/api/grafiek?${q.toString()}`;
  }, [chips, tipe, reeks, raam, opskrif, subtitel]);

  async function stoor() {
    if (!url) return;
    setStoorBesig(true);
    setBoodskap(null);
    try {
      const res = await fetch(`${url}&stoor=1`);
      const d = await res.json();
      setBoodskap(d.url ? "Gestoor in die galery." : d.fout ?? "Kon nie stoor nie.");
    } catch {
      setBoodskap("Netwerkfout.");
    } finally {
      setStoorBesig(false);
    }
  }

  return (
    <div>
      <div className="relative max-w-xl">
        <input
          value={soek}
          onChange={(e) => soekTik(e.target.value)}
          placeholder="Soek aandeel of tikker (bv. Naspers, 0700.HK)…"
          className="w-full border-2 border-ink bg-offwhite px-3 py-2 text-sm outline-none focus:border-red"
        />
        {treffers.length ? (
          <ul className="absolute inset-x-0 top-full z-10 border-2 border-t-0 border-ink bg-offwhite">
            {treffers.map((t) => (
              <li key={t.simbool}>
                <button
                  onClick={() => voegBy(t)}
                  className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-sm hover:bg-ink hover:text-offwhite"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.naam}</span>
                  <span className="text-xs tabular-nums opacity-60">{t.simbool}</span>
                  <span className="text-[10px] tracking-wide opacity-50">{t.beurs.toUpperCase()}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {chips.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <span
              key={c.simbool}
              className="flex items-center gap-2 border-2 border-ink bg-offwhite px-2.5 py-1 text-sm font-semibold"
            >
              <span aria-hidden className="size-3" style={{ backgroundColor: KLEURE[i % KLEURE.length] }} />
              {c.simbool.replace(".JO", "")}
              <button
                onClick={() => setChips(chips.filter((x) => x.simbool !== c.simbool))}
                className="text-red/70 hover:text-red"
                aria-label={`Verwyder ${c.simbool}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink/50">Voeg 2 of meer aandele by vir 'n vergelyking.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex border-2 border-ink">
          {TIPES.map((t) => (
            <button
              key={t.w}
              onClick={() => setTipe(t.w)}
              className={`px-3 py-1.5 text-xs font-semibold ${tipe === t.w ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"}`}
            >
              {t.n}
            </button>
          ))}
        </span>
        <span className="flex border-2 border-ink">
          {REEKSE.map((r) => (
            <button
              key={r.w}
              onClick={() => setReeks(r.w)}
              className={`px-3 py-1.5 text-xs font-semibold ${reeks === r.w ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"}`}
            >
              {r.n}
            </button>
          ))}
        </span>
        <span className="flex border-2 border-ink">
          {(["poskaart", "kaal"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRaam(r)}
              className={`px-3 py-1.5 text-xs font-semibold ${raam === r ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"}`}
            >
              {r === "poskaart" ? "Poskaart" : "Kaal"}
            </button>
          ))}
        </span>
      </div>

      <div className="mt-2 flex max-w-xl flex-col gap-2">
        <input
          value={opskrif}
          onChange={(e) => setOpskrif(e.target.value)}
          placeholder="Opskrif (outo as jy dit los)"
          className="border-2 border-ink bg-offwhite px-3 py-2 text-sm outline-none focus:border-red"
        />
        <input
          value={subtitel}
          onChange={(e) => setSubtitel(e.target.value)}
          placeholder="Onderskrif (outo as jy dit los)"
          className="border-2 border-ink bg-offwhite px-3 py-2 text-sm outline-none focus:border-red"
        />
      </div>

      {url ? (
        <div className="mt-5 max-w-4xl">
          <div className="border-2 border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Grafiek-voorskou" className="w-full" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85"
            >
              Laai af / maak oop
            </a>
            <button
              onClick={stoor}
              disabled={stoorBesig}
              className="border-2 border-ink bg-offwhite px-4 py-2 text-sm font-semibold hover:bg-paper disabled:opacity-50"
            >
              {stoorBesig ? "Stoor…" : "Stoor in galery"}
            </button>
            {boodskap ? <span className="text-sm text-ink/60">{boodskap}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
