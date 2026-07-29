"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Kwotasie, ReeksPunt } from "@/lib/markets/source";
import { Pyl } from "@/components/markte/format";
import type { SensItem } from "@/components/markte/sens";

export type BladHouding = {
  simbool: string;
  naam: string | null;
  aantal: number;
  koopprys: number;
  geldeenheid: string;
};

const fmtR = new Intl.NumberFormat("af-ZA", { maximumFractionDigits: 0 });
const fmtR2 = new Intl.NumberFormat("af-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rand(n: number): string {
  return `R ${(Math.abs(n) >= 10_000 ? fmtR : fmtR2).format(n)}`;
}

/** Wisselkoers-omskakeling na rand met die live FX-kaart. */
function naRand(bedrag: number, geldeenheid: string, fx: Map<string, number>): number {
  if (geldeenheid === "ZAR" || geldeenheid === "ZAc") return geldeenheid === "ZAc" ? bedrag / 100 : bedrag;
  const koers =
    geldeenheid === "USD"
      ? fx.get("ZAR=X")
      : geldeenheid === "EUR"
        ? fx.get("EURZAR=X")
        : geldeenheid === "GBP"
          ? fx.get("GBPZAR=X")
          : null;
  return koers ? bedrag * koers : bedrag;
}

const REEKSE = [
  { w: "1mo", n: "1M" },
  { w: "6mo", n: "6M" },
  { w: "1y", n: "1J" },
] as const;

export function PortefeuljeBlad({
  houdings,
  kwotasies,
  sens,
  notas,
}: {
  houdings: BladHouding[];
  kwotasies: Kwotasie[];
  sens: SensItem[];
  notas: Record<string, string>;
}) {
  const kaart = new Map(kwotasies.map((k) => [k.simbool, k]));
  const fx = new Map<string, number>(
    ["ZAR=X", "EURZAR=X", "GBPZAR=X"].map((s) => [s, kaart.get(s)?.prys ?? 0]).filter(([, v]) => v) as [string, number][]
  );

  const [range, setRange] = useState<(typeof REEKSE)[number]["w"]>("1mo");
  const [reekse, setReekse] = useState<Record<string, ReeksPunt[]>>({});
  const [oopRy, setOopRy] = useState<string | null>(null);

  // waardasie per houding
  const rye = houdings.map((h) => {
    const k = kaart.get(h.simbool);
    const prysRand = k ? naRand(k.prys, k.geldeenheid, fx) : null;
    const koopRand = naRand(h.koopprys, h.geldeenheid, fx);
    const waarde = (prysRand ?? koopRand) * h.aantal;
    return {
      ...h,
      kwotasie: k ?? null,
      prysRand,
      koopRand,
      waarde,
      wv: prysRand != null ? (prysRand - koopRand) * h.aantal : null,
      dag: k?.deltaPersent ?? null,
    };
  });
  const totaal = rye.reduce((t, r) => t + r.waarde, 0);
  const kosbasis = rye.reduce((t, r) => t + r.koopRand * r.aantal, 0);
  const dagDelta = rye.reduce((t, r) => (r.dag != null ? t + (r.waarde - r.waarde / (1 + r.dag / 100)) : t), 0);
  const wv = totaal - kosbasis;

  const beste = [...rye].filter((r) => r.dag != null).sort((a, b) => b.dag! - a.dag!);
  const slegste = beste[beste.length - 1];

  // reekse vir die grafiek (portefeulje + Top 40-benchmark)
  const laaiReekse = useCallback(async () => {
    const simbole = [...houdings.map((h) => h.simbool), "STX40.JO"];
    const nuwe: Record<string, ReeksPunt[]> = {};
    await Promise.all(
      simbole.map(async (s) => {
        try {
          const res = await fetch(`/api/markte/series?simbool=${encodeURIComponent(s)}&reeks=${range}`);
          if (res.ok) nuwe[s] = (await res.json()).reeks;
        } catch {
          /* stil */
        }
      })
    );
    setReekse(nuwe);
  }, [houdings, range]);

  useEffect(() => {
    if (houdings.length) laaiReekse();
  }, [laaiReekse, houdings.length]);

  // rekonstruksie: waarde-oor-tyd = Σ aantal × prys(t), FX teen vandag se koers
  const grafiekData = (() => {
    const basis = reekse[houdings[0]?.simbool ?? ""] ?? [];
    if (basis.length < 2) return null;
    const punte = basis.map((bp) => {
      let som = 0;
      for (const h of houdings) {
        const r = reekse[h.simbool];
        if (!r?.length) {
          som += naRand(h.koopprys, h.geldeenheid, fx) * h.aantal;
          continue;
        }
        // laaste punt ≤ t (dra vorentoe oor gate/opskortings)
        let p = r[0].p;
        for (const punt of r) {
          if (punt.t <= bp.t) p = punt.p;
          else break;
        }
        const geld = kaart.get(h.simbool)?.geldeenheid ?? "ZAR";
        som += naRand(p, geld, fx) * h.aantal;
      }
      return { t: bp.t, w: som };
    });
    return punte;
  })();

  const benchmarkPersent = (() => {
    const r = reekse["STX40.JO"];
    if (!r || r.length < 2) return null;
    return ((r[r.length - 1].p - r[0].p) / r[0].p) * 100;
  })();
  const portefeuljePersent =
    grafiekData && grafiekData[0].w > 0
      ? ((grafiekData[grafiekData.length - 1].w - grafiekData[0].w) / grafiekData[0].w) * 100
      : null;

  // toewysing
  const oorsee = rye.filter((r) => (r.kwotasie?.geldeenheid ?? "ZAR") !== "ZAR").reduce((t, r) => t + r.waarde, 0);

  if (!houdings.length) {
    return (
      <div className="max-w-xl border-2 border-ink bg-offwhite p-6">
        <p className="text-xs font-semibold tracking-[0.16em]">
          NOG GEEN PORTEFEULJE NIE
          <span aria-hidden className="ml-2 inline-block size-1.5 rounded-full bg-red align-middle" />
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Voeg jou aandele by onder MY PORTEFEULJE op die Tuis-oortjie — dan kry jy hier die
          volle prentjie: waarde oor tyd, toewysing, en alles wat ons oor jou aandele weet.
        </p>
        <Link href="/markte" className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-offwhite hover:border-red hover:bg-red">
          Na Tuis →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* opsomming-kop */}
      <section className="border-2 border-ink bg-offwhite px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink/50">TOTALE WAARDE</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">{rand(totaal)}</p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
          <span className={dagDelta >= 0 ? "text-green" : "text-red"}>
            <Pyl op={dagDelta >= 0} /> {dagDelta >= 0 ? "+" : "−"}
            {rand(Math.abs(dagDelta))} vandag
          </span>
          <span className={wv >= 0 ? "text-green" : "text-red"}>
            {wv >= 0 ? "+" : "−"}
            {rand(Math.abs(wv))} sedert koop ({kosbasis > 0 ? `${wv >= 0 ? "+" : ""}${((wv / kosbasis) * 100).toFixed(1)}%` : "—"})
          </span>
        </div>
        {beste.length > 1 ? (
          <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-ink/60">
            <span>
              Beste vandag: <span className="font-semibold text-green">{beste[0].naam ?? beste[0].simbool} +{beste[0].dag!.toFixed(2)}%</span>
            </span>
            {slegste.dag! < 0 ? (
              <span>
                Slegste: <span className="font-semibold text-red">{slegste.naam ?? slegste.simbool} {slegste.dag!.toFixed(2)}%</span>
              </span>
            ) : null}
          </p>
        ) : null}
      </section>

      {/* waarde-oor-tyd */}
      <section className="border-2 border-ink bg-offwhite">
        <h2 className="flex items-center justify-between border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
          WAARDE OOR TYD
          <span className="flex border border-ink/30 normal-case tracking-normal">
            {REEKSE.map((r) => (
              <button
                key={r.w}
                onClick={() => setRange(r.w)}
                className={`px-2.5 py-0.5 text-xs font-semibold ${range === r.w ? "bg-ink text-offwhite" : "hover:bg-paper"}`}
              >
                {r.n}
              </button>
            ))}
          </span>
        </h2>
        <div className="px-4 py-3">
          {grafiekData ? (
            <WaardeGrafiek punte={grafiekData} kosbasis={kosbasis} />
          ) : (
            <p className="py-6 text-sm text-ink/50">Laai die grafiek…</p>
          )}
          {portefeuljePersent != null && benchmarkPersent != null ? (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <span aria-hidden className={`size-2 rounded-full ${portefeuljePersent >= benchmarkPersent ? "bg-green" : "bg-red"}`} />
              <span className="font-semibold tabular-nums">
                Jy: {portefeuljePersent >= 0 ? "+" : ""}
                {portefeuljePersent.toFixed(2)}% · Top 40: {benchmarkPersent >= 0 ? "+" : ""}
                {benchmarkPersent.toFixed(2)}%
              </span>
              <span className="text-ink/60">oor dié tydperk</span>
            </p>
          ) : null}
          <p className="mt-1 text-xs text-ink/40">
            Berekening neem aan jy het jou huidige aandele deurgaans besit; buitelandse pryse teen vandag se wisselkoers.
          </p>
        </div>
      </section>

      {/* toewysing */}
      <section className="border-2 border-ink bg-offwhite">
        <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">TOEWYSING</h2>
        <ul className="divide-y divide-ink/10">
          {[...rye]
            .sort((a, b) => b.waarde - a.waarde)
            .map((r) => {
              const persent = totaal > 0 ? (r.waarde / totaal) * 100 : 0;
              return (
                <li key={r.simbool} className="relative px-4 py-2">
                  <div aria-hidden className="absolute inset-y-1 left-0 bg-ink/8" style={{ width: `${persent}%` }} />
                  <div className="relative flex items-baseline gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.naam ?? r.simbool}</span>
                    <span className="tabular-nums text-ink/60">{rand(r.waarde)}</span>
                    <span className="w-14 text-right font-bold tabular-nums">{persent.toFixed(1)}%</span>
                  </div>
                </li>
              );
            })}
        </ul>
        {oorsee > 0 ? (
          <p className="border-t border-ink/15 px-4 py-2 text-xs text-ink/60">
            JSE {totaal > 0 ? (((totaal - oorsee) / totaal) * 100).toFixed(0) : 0}% · oorsee{" "}
            {totaal > 0 ? ((oorsee / totaal) * 100).toFixed(0) : 0}%
          </p>
        ) : null}
      </section>

      {/* houdings in detail */}
      <section className="border-2 border-ink bg-offwhite">
        <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">MY AANDELE</h2>
        <ul className="divide-y divide-ink/10">
          {rye.map((r) => {
            const oop = oopRy === r.simbool;
            const kode = r.simbool.replace(".JO", "");
            const mySens = sens.filter((s) => s.kode === kode).slice(0, 3);
            const nota = notas[r.simbool];
            const reeks = reekse[r.simbool];
            return (
              <li key={r.simbool}>
                <button
                  onClick={() => setOopRy(oop ? null : r.simbool)}
                  className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left hover:bg-paper"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {r.naam ?? r.simbool}{" "}
                    <span className="text-xs font-normal text-ink/50">× {fmtR.format(r.aantal)}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">{rand(r.waarde)}</span>
                  {r.dag != null ? (
                    <span className={`flex w-20 items-center justify-end gap-1 text-sm font-semibold tabular-nums ${r.dag >= 0 ? "text-green" : "text-red"}`}>
                      <Pyl op={r.dag >= 0} />
                      {r.dag >= 0 ? "+" : ""}
                      {r.dag.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="w-20 text-right text-xs text-ink/40">—</span>
                  )}
                </button>
                {oop ? (
                  <div className="border-t border-ink/10 bg-paper/50 px-4 pb-3 pt-2">
                    <p className="flex flex-wrap gap-x-4 text-xs tabular-nums text-ink/60">
                      {r.wv != null ? (
                        <span className={r.wv >= 0 ? "text-green" : "text-red"}>
                          {r.wv >= 0 ? "+" : "−"}
                          {rand(Math.abs(r.wv))} sedert koop
                        </span>
                      ) : null}
                      <span>koopprys {r.geldeenheid === "ZAR" ? rand(r.koopprys) : `${r.geldeenheid} ${r.koopprys}`}</span>
                      {r.prysRand != null ? <span>nou {rand(r.prysRand)}</span> : null}
                      <span>{totaal > 0 ? ((r.waarde / totaal) * 100).toFixed(1) : 0}% van portefeulje</span>
                    </p>
                    {reeks && reeks.length > 1 ? <MiniSparkline reeks={reeks} /> : null}
                    {nota ? <p className="mt-2 text-[13px] leading-snug text-ink/70">💡 {nota}</p> : null}
                    {mySens.length ? (
                      <ul className="mt-2 space-y-1">
                        {mySens.map((s) => (
                          <li key={s.sens_id} className="text-xs text-ink/60">
                            <span className="font-semibold text-ink/80">SENS:</span> {s.opsomming ?? s.titel}{" "}
                            <a href={s.skakel} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-red">
                              skakel →
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <Link
        href="/markte?vra=portefeulje"
        className="inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-offwhite hover:border-red hover:bg-red"
      >
        Vra Buitelyn oor my portefeulje →
      </Link>
    </div>
  );
}

function WaardeGrafiek({ punte, kosbasis }: { punte: { t: number; w: number }[]; kosbasis: number }) {
  const w = 720;
  const h = 200;
  const alles = [...punte.map((p) => p.w), kosbasis];
  const min = Math.min(...alles) * 0.995;
  const maks = Math.max(...alles) * 1.005;
  const x = (i: number) => (i / (punte.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (maks - min)) * (h - 12) - 6;
  const op = punte[punte.length - 1].w >= punte[0].w;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1="0" x2={w} y1={y(kosbasis)} y2={y(kosbasis)} stroke="#1A1A1A" strokeOpacity="0.25" strokeDasharray="4 4" />
      <polyline
        points={punte.map((p, i) => `${x(i)},${y(p.w)}`).join(" ")}
        fill="none"
        stroke={op ? "var(--brand-green)" : "var(--brand-red)"}
        strokeWidth="2.5"
      />
    </svg>
  );
}

function MiniSparkline({ reeks }: { reeks: ReeksPunt[] }) {
  const w = 560;
  const h = 56;
  const min = Math.min(...reeks.map((r) => r.p));
  const maks = Math.max(...reeks.map((r) => r.p));
  const span = maks - min || 1;
  const op = reeks[reeks.length - 1].p >= reeks[0].p;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-14 w-full">
      <polyline
        points={reeks.map((r, i) => `${(i / (reeks.length - 1)) * w},${h - ((r.p - min) / span) * (h - 6) - 3}`).join(" ")}
        fill="none"
        stroke={op ? "var(--brand-green)" : "var(--brand-red)"}
        strokeWidth="2"
      />
    </svg>
  );
}
