"use client";

import { useEffect, useRef, useState } from "react";
import { outoStoor, kryWeergawes, type Weergawe } from "@/app/actions-weergawes";

/* Outostoor vir Studio-redigeerders:
   - localStorage onmiddellik (oorleef weg-navigeer/verfris, selfs vanlyn)
   - bediener-snapshot elke 20s wanneer die teks verander het
   - WEERGAWES-paneel om enige snapshot terug te rol */

const tydFmt = new Intl.DateTimeFormat("af-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" });

export function useOutostoor(
  tipe: "oorsig" | "konsep" | "oudio",
  datum: string,
  teks: string,
  setTeks: (t: string) => void
) {
  const [status, setStatus] = useState("");
  const laasteGestoor = useRef("");
  const sleutel = `buitelyn-konsep-${tipe}-${datum}`;

  // herstel 'n ongestoorde konsep uit localStorage by laai
  useEffect(() => {
    try {
      const bewaar = localStorage.getItem(sleutel);
      if (bewaar && bewaar !== teks && bewaar.length > (teks?.length ?? 0)) {
        /* Dit is presies die geval waarvoor effekte bedoel is: sinchroniseer
           'n EKSTERNE stelsel (localStorage) na React-toestand toe. Dit loop
           een keer per sleutel en herstel werk wat AP andersins verloor — die
           rede waarom hierdie hook bestaan. Doelbewus NIE herstruktureer nie:
           die risiko weeg swaarder as die wins. */
        /* eslint-disable react-hooks/set-state-in-effect */
        setTeks(bewaar);
        setStatus("Ongestoorde werk herstel");
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* privaat modus ens. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel]);

  // localStorage dadelik (gedebounce 800ms)
  useEffect(() => {
    if (!teks) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(sleutel, teks);
      } catch {
        /* stil */
      }
    }, 800);
    return () => clearTimeout(id);
  }, [teks, sleutel]);

  // bediener-snapshot elke 20s as dit verander het
  useEffect(() => {
    const id = setInterval(async () => {
      if (!teks?.trim() || teks === laasteGestoor.current) return;
      laasteGestoor.current = teks;
      const t = await outoStoor(tipe, teks, datum);
      if (t) setStatus(`Outomaties gestoor ${tydFmt.format(new Date(t))}`);
    }, 20_000);
    return () => clearInterval(id);
  }, [teks, tipe, datum]);

  return status;
}

export function WeergawePaneel({
  tipe,
  datum,
  opHerstel,
}: {
  tipe: "oorsig" | "konsep" | "oudio";
  datum: string;
  opHerstel: (teks: string) => void;
}) {
  const [oop, setOop] = useState(false);
  const [weergawes, setWeergawes] = useState<Weergawe[] | null>(null);

  const maakOop = async () => {
    setOop(!oop);
    if (!weergawes) setWeergawes(await kryWeergawes(tipe, datum));
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={maakOop}
        className="border-2 border-ink px-3 py-2 text-sm font-semibold hover:bg-paper"
      >
        Weergawes {oop ? "▴" : "▾"}
      </button>
      {oop ? (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-72 w-72 overflow-y-auto border-2 border-ink bg-offwhite shadow-lg">
          {weergawes === null ? (
            <p className="px-3 py-2 text-sm text-ink/50">Laai…</p>
          ) : weergawes.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink/50">Nog geen weergawes vir dié dag nie.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {weergawes.map((w) => (
                <li key={w.id}>
                  <button
                    onClick={() => {
                      opHerstel(w.teks);
                      setOop(false);
                    }}
                    className="flex w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-paper"
                  >
                    <span className="text-xs font-bold tabular-nums">{tydFmt.format(new Date(w.geskep_at))}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink/60">
                      {w.teks.replace(/\s+/g, " ").slice(0, 60)}…
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
