"use client";

import { useEffect, useRef, useState } from "react";
import type { Kaart } from "@/lib/kaart/spec";

/* Lewendige voorskou van 'n kaart.

   Dit is 'n bediener-heen-en-weer, NIE 'n HTML/CSS-namaaksel van die style
   nie. Die blaaier laai League Spartan via next/font/google terwyl die
   bediener uit plaaslike TTF's render, en satori breek reëls self sonder
   afbreking of text-wrap: balance. Vir 'n kaart waarvan die hele gehalte lê
   in "breek hierdie opskrif ná woord vyf of ses", sou 'n namaaksel juis
   verkeerd wees waar dit saak maak. */

const KAS_GROOTTE = 12;

export type Voorskou = { url: string | null; besig: boolean; fout: string | null };

export function useVoorskou(kaart: Kaart, datum: string, wag = 400): Voorskou {
  const [url, setUrl] = useState<string | null>(null);
  const [besig, setBesig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  const kas = useRef<Map<string, string>>(new Map());
  const beheer = useRef<AbortController | null>(null);
  const sleutel = JSON.stringify(kaart) + `|${datum}`;

  useEffect(() => {
    const gekas = kas.current.get(sleutel);
    if (gekas) {
      setUrl(gekas);
      setBesig(false);
      setFout(null);
      return;
    }

    setBesig(true);
    const tik = setTimeout(async () => {
      // Sonder afbreking gee 'n vinnige tikker antwoorde uit volgorde terug en
      // die voorskou flikker agteruit. grafiek-studio ontsnap dit net omdat die
      // blaaier <img src>-ruilings self kanselleer.
      beheer.current?.abort();
      const c = new AbortController();
      beheer.current = c;
      try {
        const res = await fetch("/api/sosiaal/kaart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kaart, datum, skaal: 0.5 }),
          signal: c.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFout(data.fout ?? "Kon nie die voorskou render nie.");
          setBesig(false);
          return;
        }
        const blob = await res.blob();
        const nuweUrl = URL.createObjectURL(blob);

        const m = kas.current;
        m.set(sleutel, nuweUrl);
        if (m.size > KAS_GROOTTE) {
          const oudste = m.keys().next().value;
          if (oudste) {
            URL.revokeObjectURL(m.get(oudste)!);
            m.delete(oudste);
          }
        }
        setUrl(nuweUrl);
        setFout(null);
        setBesig(false);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          setFout("Netwerkfout.");
          setBesig(false);
        }
      }
    }, wag);

    return () => clearTimeout(tik);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel, wag]);

  // Ruim alle objek-URL's op wanneer die studio toemaak.
  useEffect(() => {
    const m = kas.current;
    return () => {
      beheer.current?.abort();
      for (const u of m.values()) URL.revokeObjectURL(u);
      m.clear();
    };
  }, []);

  return { url, besig, fout };
}
