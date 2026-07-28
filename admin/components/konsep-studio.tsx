"use client";

import { useState, useTransition } from "react";
import { skepNuusbriefKonsep, stoorNuusbriefKonsep } from "@/app/actions-nuusbrief";

export function KonsepStudio({ aanvanklik }: { aanvanklik: string }) {
  const [teks, setTeks] = useState(aanvanklik);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [besig, begin] = useTransition();

  function genereer() {
    setBoodskap(null);
    begin(async () => {
      const nuut = await skepNuusbriefKonsep();
      if (nuut) {
        setTeks(nuut);
        setBoodskap("Konsep gegenereer — redigeer gerus.");
      } else {
        setBoodskap("Kon nie genereer nie — probeer weer.");
      }
    });
  }

  function stoor() {
    begin(async () => {
      await stoorNuusbriefKonsep(teks);
      setBoodskap("Gestoor.");
    });
  }

  async function kopieer() {
    await navigator.clipboard.writeText(teks);
    setBoodskap("Gekopieer — plak in Substack.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={genereer}
          disabled={besig}
          className="h-11 bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          {besig ? "Besig…" : teks ? "Genereer oor" : "Genereer vandag se konsep"}
        </button>
        {teks ? (
          <>
            <button
              onClick={stoor}
              disabled={besig}
              className="h-11 border-2 border-ink bg-offwhite px-4 text-sm font-semibold hover:bg-paper disabled:opacity-50"
            >
              Stoor
            </button>
            <button
              onClick={kopieer}
              className="h-11 border-2 border-ink bg-offwhite px-4 text-sm font-semibold hover:bg-paper"
            >
              Kopieer vir Substack
            </button>
          </>
        ) : null}
        {boodskap ? <span className="text-sm text-ink/60">{boodskap}</span> : null}
      </div>

      {teks ? (
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          rows={28}
          className="mt-4 w-full border-2 border-ink bg-offwhite p-4 font-mono text-sm leading-relaxed outline-none focus:border-red"
        />
      ) : (
        <p className="mt-4 max-w-lg text-sm text-ink/60">
          Die konsep word gebou uit die markte-pyplyn: die oggend se dagoorsig, die
          top-nuus met bronskakels, en live syfers. Genereer, redigeer hier, en plak
          dan in Substack.
        </p>
      )}
    </div>
  );
}
