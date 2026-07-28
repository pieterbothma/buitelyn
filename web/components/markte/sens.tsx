"use client";

import { useState } from "react";

export type SensItem = {
  sens_id: string;
  tyd: string;
  kode: string | null;
  maatskappy: string;
  titel: string;
  tipe: string;
  opsomming: string | null;
  skakel: string;
};

const TIPE_NAME: Record<string, string> = {
  resultate: "Resultate",
  dividend: "Dividende",
  direkteure: "Direkteure",
  transaksie: "Transaksies",
  terugkoop: "Terugkope",
  notering: "Noterings",
  agv: "AJV's",
  kennisgewing: "Kennisgewings",
};

function maakNetjies(naam: string): string {
  // "HOSKEN CONSOLIDATED INVESTMENTS LIMITED" → "Hosken Consolidated Investments"
  const klein = naam
    .toLowerCase()
    .replace(/\b(limited|ltd|proprietary|holdings? company)\b\.?/g, "")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bN\.v\b/g, "N.V");
  return klein.length > 2 ? klein : naam;
}

export function SensBord({ items, eieSimbole }: { items: SensItem[]; eieSimbole: string[] }) {
  const [tipe, setTipe] = useState<string>("alles");
  const [netMyne, setNetMyne] = useState(false);

  const eie = new Set(eieSimbole.map((s) => s.replace(".JO", "")));
  const gefiltreer = items.filter(
    (i) => (tipe === "alles" || i.tipe === tipe) && (!netMyne || (i.kode && eie.has(i.kode)))
  );

  const tipes = ["alles", ...Object.keys(TIPE_NAME).filter((t) => items.some((i) => i.tipe === t))];

  const dagVan = (tyd: string) =>
    new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "numeric", month: "long" }).format(new Date(tyd));
  const tydVan = (tyd: string) =>
    new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" }).format(new Date(tyd));

  let vorigeDag = "";

  return (
    <div>
      {/* Een horisontaal-rolbare strook los pille — geen geknelde wikkel-boks op mobiel nie */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {eieSimbole.length ? (
          <button
            onClick={() => setNetMyne(!netMyne)}
            className={`shrink-0 whitespace-nowrap border-2 px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${
              netMyne ? "border-red bg-red text-offwhite" : "border-ink bg-offwhite hover:bg-paper"
            }`}
          >
            ⭐ MYNE
          </button>
        ) : null}
        {tipes.map((t) => (
          <button
            key={t}
            onClick={() => setTipe(t)}
            className={`shrink-0 whitespace-nowrap border-2 border-ink px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${
              tipe === t ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
            }`}
          >
            {t === "alles" ? "ALLES" : TIPE_NAME[t].toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-4 border-2 border-ink bg-offwhite">
        <ul className="divide-y divide-ink/10">
          {gefiltreer.map((i) => {
            const dag = dagVan(i.tyd);
            const wysDag = dag !== vorigeDag;
            vorigeDag = dag;
            const myne = i.kode ? eie.has(i.kode) : false;
            return (
              <li key={i.sens_id}>
                {wysDag ? (
                  <p className="border-b border-ink/10 bg-paper px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink/50">
                    {dag.toUpperCase()}
                  </p>
                ) : null}
                <div className="px-4 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="text-xs tabular-nums text-ink/40">{tydVan(i.tyd)}</span>
                    {i.kode ? (
                      <span className="border border-ink/30 bg-paper px-1.5 text-xs font-bold tracking-wide">
                        {i.kode}
                      </span>
                    ) : null}
                    <span className="text-sm font-semibold">
                      {maakNetjies(i.maatskappy)}
                      {myne ? " ⭐" : ""}
                    </span>
                    <span className="text-[11px] tracking-[0.1em] text-ink/40">
                      {(TIPE_NAME[i.tipe] ?? i.tipe).toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 break-words text-[13px] leading-snug text-ink/70">
                    {i.opsomming ?? i.titel}{" "}
                    <a
                      href={i.skakel}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap text-ink/40 underline underline-offset-2 hover:text-red"
                    >
                      skakel →
                    </a>
                  </p>
                </div>
              </li>
            );
          })}
          {gefiltreer.length === 0 ? (
            <li className="px-4 py-6 text-sm text-ink/50">
              {netMyne ? "Geen SENS oor jou aandele in dié lys nie." : "Nog niks hier nie — die eerste aankondigings kom binnekort in."}
            </li>
          ) : null}
        </ul>
      </div>
      <p className="mt-2 text-xs text-ink/50">
        SENS-aankondigings van gelyste JSE-aandele · opsommings deur Buitelyn se KI · volteks by Sharenet
      </p>
    </div>
  );
}
