"use client";

import { useState } from "react";
import type { Kwotasie } from "@/lib/markets/source";
import { bewegersNaam } from "@/lib/markets/boards";
import { formatteerPrys, Pyl } from "@/components/markte/format";

/* Ou notas kan [bron](url)-skakels bevat — render as ankers, moenie rou wys nie. */
function Nota({ teks }: { teks: string }) {
  const dele = teks.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g);
  return (
    <>
      {dele.map((d, i) => {
        const m = d.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        if (!m) return <span key={i}>{d}</span>;
        return (
          <a key={i} href={m[2].replace(/[?&]utm_source=openai/, "")} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-red">
            {m[1]}
          </a>
        );
      })}
    </>
  );
}

type Aansig = "bewegers" | "wenners" | "verloorders";

const AANSIGTE: { sleutel: Aansig; naam: string }[] = [
  { sleutel: "bewegers", naam: "Grootste Bewegers" },
  { sleutel: "wenners", naam: "Grootste Wenners" },
  { sleutel: "verloorders", naam: "Grootste Verloorders" },
];

export function BewegersBord({
  kwotasies,
  notas = {},
}: {
  kwotasies: Kwotasie[];
  notas?: Record<string, string>;
}) {
  const [aansig, setAansig] = useState<Aansig>("bewegers");

  const met = kwotasies.filter((k) => k.deltaPersent != null);
  const gesorteer =
    aansig === "wenners"
      ? [...met].sort((a, b) => b.deltaPersent! - a.deltaPersent!).filter((k) => k.deltaPersent! > 0)
      : aansig === "verloorders"
        ? [...met].sort((a, b) => a.deltaPersent! - b.deltaPersent!).filter((k) => k.deltaPersent! < 0)
        : [...met].sort((a, b) => Math.abs(b.deltaPersent!) - Math.abs(a.deltaPersent!));
  const top = gesorteer.slice(0, 15);
  const maks = Math.max(...top.map((k) => Math.abs(k.deltaPersent!)), 0.1);

  return (
    <div>
      {/* Mobiel: onder mekaar (volwydte); md+: langs mekaar */}
      <div className="flex flex-col border-2 border-ink bg-offwhite md:flex-row">
        {AANSIGTE.map((a) => (
          <button
            key={a.sleutel}
            onClick={() => setAansig(a.sleutel)}
            className={`border-b border-ink/20 px-4 py-2 text-left text-xs font-semibold tracking-[0.12em] last:border-b-0 md:border-b-0 md:border-r md:text-center md:last:border-r-0 ${
              aansig === a.sleutel ? "bg-ink text-offwhite" : "hover:bg-paper"
            }`}
          >
            {a.naam.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-4 border-2 border-ink bg-offwhite">
        <ul className="divide-y divide-ink/10">
          {top.map((k, i) => {
            const d = k.deltaPersent!;
            const op = d >= 0;
            const breedte = (Math.abs(d) / maks) * 100;
            return (
              <li key={k.simbool} className="relative px-4 py-2.5">
                {/* balk agter die teks — breedte ∝ |Δ%| */}
                <div
                  aria-hidden
                  className={`absolute inset-y-1 left-0 ${op ? "bg-green/15" : "bg-red/15"}`}
                  style={{ width: `${breedte}%` }}
                />
                <div className="relative flex items-baseline gap-3">
                  <span className="w-6 text-xs font-bold tabular-nums text-ink/40">{i + 1}</span>
                  <span className="w-16 text-xs font-bold tracking-wide text-ink/60">
                    {k.simbool.replace(".JO", "")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {bewegersNaam(k.simbool)}
                  </span>
                  <span className="hidden text-sm tabular-nums text-ink/60 sm:block">
                    {formatteerPrys(k)}
                  </span>
                  <span
                    className={`flex w-24 items-center justify-end gap-1.5 text-sm font-bold tabular-nums ${
                      op ? "text-green" : "text-red"
                    }`}
                  >
                    <Pyl op={op} />
                    {op ? "+" : ""}
                    {d.toFixed(2)}%
                  </span>
                </div>
                {notas[k.simbool] ? (
                  <p className="relative mt-1 break-words pl-9 pr-2 text-[13px] leading-snug text-ink/70">
                    <Nota teks={notas[k.simbool]} />
                  </p>
                ) : null}
              </li>
            );
          })}
          {top.length === 0 ? (
            <li className="px-4 py-6 text-sm text-ink/50">
              {aansig === "wenners"
                ? "Geen wenners vandag nie — dis so 'n dag."
                : aansig === "verloorders"
                  ? "Geen verloorders vandag nie — mooi so."
                  : "Geen data nie."}
            </li>
          ) : null}
        </ul>
      </div>
      <p className="mt-2 text-xs text-ink/50">
        JSE-hoofname · % teenoor gister se sluiting · data ±15 min vertraag
      </p>
    </div>
  );
}
