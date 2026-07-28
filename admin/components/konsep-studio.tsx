"use client";

import { useEffect, useState, useTransition } from "react";
import {
  kryFotoIdees,
  skepNuusbriefKonsep,
  stoorNuusbriefKonsep,
  type FotoIdee,
} from "@/app/actions-nuusbrief";
import { verwerkTeksVirAudio } from "@/app/actions-audio";

function AudioModal({ bronTeks, toe }: { bronTeks: string; toe: () => void }) {
  const [teks, setTeks] = useState<string | null>(null);
  const [mp3, setMp3] = useState<string | null>(null);
  const [besig, setBesig] = useState<"verwerk" | "genereer" | null>("verwerk");
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const skoon = await verwerkTeksVirAudio(bronTeks);
      setTeks(skoon ?? "");
      if (!skoon) setFout("Kon nie verwerk nie — probeer weer.");
      setBesig(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function genereer() {
    if (!teks?.trim()) return;
    setBesig("genereer");
    setFout(null);
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titel: `Konsep-audio ${new Date().toLocaleDateString("af-ZA")}`, teks }),
      });
      const data = await res.json();
      if (res.ok) setMp3(data.mp3);
      else setFout(data.fout ?? "Kon nie genereer nie.");
    } catch {
      setFout("Netwerkfout.");
    } finally {
      setBesig(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={toe}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col border-2 border-ink bg-offwhite p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">Verwerk Teks vir Audio</h2>
          <button onClick={toe} className="text-sm font-semibold text-ink/50 hover:text-ink">
            Maak toe ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          Simbole, skakels en markdown is uitgehaal; syfers en uitsprake (rie-olie) is
          leesbaar gemaak. Redigeer en genereer.
        </p>
        {teks === null ? (
          <p className="mt-6 text-sm text-ink/60">Verwerk die konsep…</p>
        ) : (
          <>
            <textarea
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              rows={14}
              className="mt-3 min-h-0 w-full flex-1 border-2 border-ink bg-paper p-3 text-sm leading-relaxed outline-none focus:border-red"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={genereer}
                disabled={besig !== null || !teks.trim()}
                className="bg-ink px-5 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
              >
                {besig === "genereer" ? "Genereer… (kan 'n minuut vat)" : "Genereer audio →"}
              </button>
              {fout ? <span className="text-sm font-semibold text-red">{fout}</span> : null}
            </div>
            {mp3 ? (
              <div className="mt-3 border-2 border-green p-3">
                <audio controls src={mp3} className="w-full" />
                <a href={mp3} download className="mt-1.5 inline-block text-sm font-semibold underline">
                  Laai MP3 af ↓
                </a>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function FotoIdees({ bestaandeFotos, aktief }: { bestaandeFotos: string[]; aktief: boolean }) {
  const [idees, setIdees] = useState<FotoIdee[]>([]);
  const [fotos, setFotos] = useState<string[]>(bestaandeFotos);
  const [eiePrompt, setEiePrompt] = useState("");
  const [grootte, setGrootte] = useState("1536x1024");
  const [besigMet, setBesigMet] = useState<string | null>(null);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [ideesBesig, beginIdees] = useTransition();

  function haalIdees() {
    setBoodskap(null);
    beginIdees(async () => {
      const lys = await kryFotoIdees();
      setIdees(lys);
      if (!lys.length) setBoodskap("Genereer eers vandag se konsep — die idees kom daaruit.");
    });
  }

  async function skep(prompt: string, etiket: string) {
    setBesigMet(etiket);
    setBoodskap(null);
    try {
      const res = await fetch("/api/fotos/skep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, size: grootte }),
      });
      const data = await res.json();
      if (data.url) setFotos((f) => [data.url, ...f]);
      else setBoodskap(data.fout ?? "Kon nie die beeld skep nie.");
    } catch {
      setBoodskap("Netwerkfout — probeer weer.");
    } finally {
      setBesigMet(null);
    }
  }

  return (
    <div className="mt-10 border-t-2 border-ink pt-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
        Foto Idees
        <span aria-hidden className="size-2 rounded-full bg-red" />
      </h2>
      <p className="mt-1 max-w-lg text-sm text-ink/60">
        {aktief
          ? "Beeld-idees uit vandag se konsep — skep met een klik, of skryf jou eie prompt."
          : "Die dag se gegenereerde beelde."}
      </p>

      {aktief ? (
      <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex border-2 border-ink">
          {[
            { w: "1536x1024", n: "Landskap" },
            { w: "1024x1024", n: "Vierkant" },
            { w: "1024x1536", n: "Portret" },
          ].map((g) => (
            <button
              key={g.w}
              type="button"
              onClick={() => setGrootte(g.w)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                grootte === g.w ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
              }`}
            >
              {g.n}
            </button>
          ))}
        </span>
        <button
          onClick={haalIdees}
          disabled={ideesBesig}
          className="h-10 border-2 border-ink bg-offwhite px-4 text-sm font-semibold hover:bg-paper disabled:opacity-50"
        >
          {ideesBesig ? "Dink…" : idees.length ? "Nuwe idees" : "Kry foto-idees"}
        </button>
        {boodskap ? <span className="text-sm text-ink/60">{boodskap}</span> : null}
      </div>

      {idees.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {idees.map((i, n) => (
            <div key={n} className="flex flex-col border-2 border-ink bg-offwhite p-4">
              <p className="flex-1 text-sm leading-relaxed">{i.beskrywing}</p>
              <button
                onClick={() => skep(i.prompt, `idee-${n}`)}
                disabled={besigMet !== null}
                className="mt-3 self-start bg-ink px-3 py-1.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
              >
                {besigMet === `idee-${n}` ? "Skep… (±30s)" : "Skep hierdie beeld"}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (eiePrompt.trim()) skep(eiePrompt.trim(), "eie");
        }}
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          value={eiePrompt}
          onChange={(e) => setEiePrompt(e.target.value)}
          placeholder="Of beskryf jou eie beeld-idee…"
          className="min-w-72 flex-1 border-2 border-ink bg-offwhite px-3 py-2 text-sm outline-none focus:border-red"
        />
        <button
          disabled={besigMet !== null || !eiePrompt.trim()}
          className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          {besigMet === "eie" ? "Skep… (±30s)" : "Skep foto"}
        </button>
      </form>
      </>
      ) : null}

      {fotos.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group block border-2 border-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Nuusbrief-beeld" className="aspect-[3/2] w-full object-cover group-hover:opacity-90" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function KonsepStudio({
  aanvanklik,
  fotos = [],
  datum,
  isVandag = true,
}: {
  aanvanklik: string;
  fotos?: string[];
  datum?: string;
  isVandag?: boolean;
}) {
  const [teks, setTeks] = useState(aanvanklik);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [audioOop, setAudioOop] = useState(false);
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
      await stoorNuusbriefKonsep(teks, datum);
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
        {isVandag ? (
          <button
            onClick={genereer}
            disabled={besig}
            className="h-11 bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
          >
            {besig ? "Besig…" : teks ? "Genereer oor" : "Genereer vandag se konsep"}
          </button>
        ) : null}
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
        <>
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          rows={28}
          className="mt-4 w-full border-2 border-ink bg-offwhite p-4 font-mono text-sm leading-relaxed outline-none focus:border-red"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => setAudioOop(true)}
            className="border-2 border-ink bg-offwhite px-4 py-2 text-sm font-semibold hover:bg-paper"
          >
            Verwerk Teks vir Audio 🎙
          </button>
        </div>
        {audioOop ? <AudioModal bronTeks={teks} toe={() => setAudioOop(false)} /> : null}
        </>
      ) : (
        <p className="mt-4 max-w-lg text-sm text-ink/60">
          Die konsep word gebou uit die markte-pyplyn: die oggend se dagoorsig, die
          top-nuus met bronskakels, en live syfers. Genereer, redigeer hier, en plak
          dan in Substack.
        </p>
      )}

      <FotoIdees bestaandeFotos={fotos} aktief={isVandag} />
    </div>
  );
}
