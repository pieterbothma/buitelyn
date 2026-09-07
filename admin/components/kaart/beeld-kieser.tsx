"use client";

import { useEffect, useState, useTransition } from "react";
import { lysGaleryFotos } from "@/app/actions-kaarte";
import { normaliseerBeeld, type BeeldBron } from "@/lib/kaart/spec";
import { BeeldSnyer } from "@/components/kaart/beeld-snyer";
import { haalJson } from "@/lib/haal";

/* Kies 'n beeld vir 'n kaart: laai een op, of vat een uit die dag se galery
   (Foto Idees, spotprente, grafieke).

   Klipy is doelbewus NIE 'n bron hier nie — sien app/actions-kaarte.ts. */

export function BeeldKieser({
  etiket,
  bron,
  datum,
  gleuf,
  stel,
}: {
  etiket: string;
  bron: BeeldBron | null;
  datum: string;
  gleuf: { w: number; h: number; rond: boolean };
  stel: (nuut: BeeldBron | null) => void;
}) {
  const [galery, setGalery] = useState<string[]>([]);
  const [galeryOop, setGaleryOop] = useState(false);
  const [besig, setBesig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [laai, begin] = useTransition();

  useEffect(() => {
    if (!galeryOop || galery.length) return;
    begin(async () => setGalery(await lysGaleryFotos(datum)));
  }, [galeryOop, galery.length, datum]);

  async function oplaai(leer: File) {
    setBesig(true);
    setFout(null);
    try {
      const vorm = new FormData();
      vorm.append("leer", leer);
      vorm.append("datum", datum);
      const u = await haalJson<{ url: string; wydte: number; hoogte: number; deursigtig: boolean }>(
        "/api/fotos/oplaai",
        { method: "POST", body: vorm }
      );
      if (!u.ok) {
        setFout(u.fout);
        return;
      }
      const data = u.data;
      stel(
        normaliseerBeeld({
          url: data.url,
          wydte: data.wydte,
          hoogte: data.hoogte,
          deursigtig: data.deursigtig,
          fokusX: 0.5,
          fokusY: 0.5,
          zoem: 1,
        })
      );
    } finally {
      setBesig(false);
    }
  }

  /* 'n Galery-beeld se natuurlike afmetings staan nie in die bucket-lys nie,
     so ons meet dit in die blaaier voordat dit die spec haal — die
     snit-wiskunde het hulle nodig. */
  function kiesUitGalery(url: string) {
    const img = new Image();
    img.onload = () => {
      stel(
        normaliseerBeeld({
          url,
          wydte: img.naturalWidth,
          hoogte: img.naturalHeight,
          deursigtig: /\.png(\?|$)/i.test(url),
          fokusX: 0.5,
          fokusY: 0.5,
          zoem: 1,
        })
      );
      setGaleryOop(false);
    };
    img.onerror = () => setFout("Kon nie die beeld laai nie.");
    img.src = url;
  }

  return (
    <div className="text-xs font-semibold">
      {etiket}

      {bron ? (
        <BeeldSnyer bron={bron} datum={datum} gleuf={gleuf} stel={stel} verwyder={() => stel(null)} />
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer border-2 border-ink bg-offwhite px-3 py-2 text-xs font-semibold hover:bg-paper">
            {besig ? "Laai op…" : "Laai beeld op"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={besig}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) oplaai(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setGaleryOop((o) => !o)}
            className="border-2 border-ink bg-offwhite px-3 py-2 text-xs font-semibold hover:bg-paper"
          >
            {galeryOop ? "Versteek galery" : "Kies uit galery"}
          </button>
          {fout ? <span className="font-semibold text-red">{fout}</span> : null}
        </div>
      )}

      {galeryOop && !bron ? (
        <div className="mt-2 border-2 border-ink bg-paper p-2">
          {laai ? (
            <p className="py-4 text-center font-normal text-ink/60">Laai…</p>
          ) : galery.length === 0 ? (
            <p className="py-4 text-center font-normal text-ink/60">
              Nog geen beelde vir vandag nie.
            </p>
          ) : (
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
              {galery.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => kiesUitGalery(url)}
                  className="border-2 border-ink hover:opacity-80"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-[3/2] w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* WebP word by oplaai na PNG/JPEG omgeskakel — satori dekodeer WebP nie
          betroubaar nie en die kaart kom stil blank uit. */}
      <p className="mt-1 font-normal text-ink/40">
        PNG of JPEG, tot 15MB. Groot foto&apos;s word na 1600px afgeskaal.
      </p>
    </div>
  );
}
