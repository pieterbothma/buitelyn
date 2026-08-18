"use client";

import { useState } from "react";
import { BeeldKieser } from "@/components/kaart/beeld-kieser";
import type { BeeldBron } from "@/lib/kaart/spec";

/* Losstaande beeldgereedskap: laai op, verwyder die agtergrond, sny, laai af.
   Dit is die een wat werklik die Canva-omweg vervang — AP het dikwels net 'n
   skoon PNG nodig, sonder 'n kaart daarom. Dieselfde komponente as die
   kaart-bouer, net sonder die kaart. */

export function BeeldGereedskap({ datum }: { datum: string }) {
  const [bron, setBron] = useState<BeeldBron | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <BeeldKieser
          etiket="Beeld"
          bron={bron}
          datum={datum}
          // Geen kaart hier — wys die beeld in sy eie verhouding.
          gleuf={{ w: bron?.wydte ?? 3, h: bron?.hoogte ?? 2, rond: false }}
          stel={setBron}
        />
        {bron ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Supabase se ?download= stel Content-Disposition: attachment.
                Die HTML-attribuut alleen werk NIE oor domeine heen nie — die
                blad is op hq.buitelyn.com en die lêer op *.supabase.co, so die
                blaaier open die beeld eerder as om dit te stoor. */}
            <a
              href={`${bron.url}?download=${encodeURIComponent(bron.url.split("/").pop() ?? "beeld.png")}`}
              className="h-11 bg-ink px-5 text-sm font-semibold leading-[2.75] text-offwhite hover:bg-ink/85"
            >
              Laai af ↓
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(bron.url)}
              className="h-11 border-2 border-ink bg-offwhite px-4 text-sm font-semibold hover:bg-paper"
            >
              Kopieer skakel
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-semibold">Voorskou</p>
        {bron ? (
          <>
            {/* Twee velle onder mekaar: 'n uitgesnyde PNG moet op LIG én DONKER
                nagegaan word, anders sien jy nie 'n vuil rand nie. */}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div className="border-2 border-ink bg-paper p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bron.url} alt="" className="w-full" />
              </div>
              <div className="border-2 border-ink bg-ink p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bron.url} alt="" className="w-full" />
              </div>
            </div>
            <p className="mt-2 text-xs text-ink/50">
              {bron.wydte}×{bron.hoogte}
              {bron.deursigtig ? " · deursigtige agtergrond" : " · ondeursigtig"}
            </p>
          </>
        ) : (
          <div className="mt-1 flex aspect-[3/2] items-center justify-center border-2 border-dashed border-ink/30 text-sm text-ink/40">
            Laai &apos;n beeld op om te begin
          </div>
        )}
      </div>
    </div>
  );
}
