"use client";

import { useEffect, useState } from "react";
import { vertaalNaAfrikaans } from "@/app/actions-nibs";
import { verwerkTeksVirAudio } from "@/app/actions-audio";

/* Twee bokse, nie een nie: die bronteks bly staan sodat 'n swak vertaling
   nooit die oorspronklike kos nie. Die skrip is die redigeerbare een — elke
   stap skryf daarin, en die etikette kan met die hand reggemaak word voor die
   stem dit praat. */
export function NibsStudio() {
  const [bron, setBron] = useState("");
  const [skrip, setSkrip] = useState("");
  const [stem, setStem] = useState<"alida" | "akker">("alida");
  const [besig, setBesig] = useState<"" | "vertaal" | "verwerk" | "oudio">("");
  const [boodskap, setBoodskap] = useState("");
  const [mp3, setMp3] = useState<string | null>(null);

  /* Nuus se "Na NIBS"-knoppie los die storie hier. Ons lees dit een keer en
     vee dit dan uit, anders duik dieselfde storie by elke besoek weer op. */
  useEffect(() => {
    try {
      const oorgedra = sessionStorage.getItem("nibs-bronteks");
      if (oorgedra) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect -- selfde
           patroon as outostoor.tsx: sinchroniseer 'n EKSTERNE stelsel
           (sessionStorage) na React-toestand toe by laai. */
        setBron(oorgedra);
        sessionStorage.removeItem("nibs-bronteks");
      }
    } catch {
      /* privaat modus ens. */
    }
  }, []);

  const vertaal = async () => {
    setBesig("vertaal");
    setBoodskap("");
    try {
      const t = await vertaalNaAfrikaans(bron);
      if (t) setSkrip(t);
      else setBoodskap("Vertaling het misluk.");
    } finally {
      setBesig("");
    }
  };

  const verwerk = async () => {
    setBesig("verwerk");
    setBoodskap("");
    try {
      /* Werk op die skrip as daar een is, anders op die bronteks — plak 'n
         mens reeds Afrikaans, spring jy stap 1 oor. */
      const t = await verwerkTeksVirAudio(skrip.trim() || bron);
      if (t) setSkrip(t);
      else setBoodskap("Verwerking het misluk.");
    } finally {
      setBesig("");
    }
  };

  const maakOudio = async () => {
    setBesig("oudio");
    setBoodskap("");
    setMp3(null);
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titel: `Nibs ${new Date().toISOString().slice(0, 10)}`,
          teks: skrip,
          stem,
        }),
      });
      const d = await res.json();
      if (res.ok) setMp3(d.mp3);
      else setBoodskap(d.fout ?? "Oudio het misluk.");
    } finally {
      setBesig("");
    }
  };

  return (
    <div className="mt-6 max-w-3xl">
      <label className="text-[11px] font-extrabold uppercase tracking-[.14em]">Bronteks</label>
      <textarea
        value={bron}
        onChange={(e) => setBron(e.target.value)}
        rows={8}
        placeholder="Plak die storie hier…"
        className="mt-2 w-full resize-y border-2 border-ink bg-offwhite p-3 text-sm leading-relaxed outline-none focus:border-red"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={vertaal}
          disabled={besig !== "" || !bron.trim()}
          className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50"
        >
          {besig === "vertaal" ? "Vertaal…" : "1. Vertaal na Afrikaans"}
        </button>
        <button
          onClick={verwerk}
          disabled={besig !== "" || (!skrip.trim() && !bron.trim())}
          className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50"
        >
          {besig === "verwerk" ? "Verwerk…" : "2. Verwerk vir oudio"}
        </button>
        {boodskap ? <span className="text-sm text-red">{boodskap}</span> : null}
      </div>

      <label className="mt-6 block text-[11px] font-extrabold uppercase tracking-[.14em]">Script</label>
      <textarea
        value={skrip}
        onChange={(e) => setSkrip(e.target.value)}
        rows={10}
        placeholder="Die vertaalde en verwerkte teks kom hier — jy kan die etikette self regmaak."
        className="mt-2 w-full resize-y border-2 border-ink bg-offwhite p-3 text-sm leading-relaxed outline-none focus:border-red"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={stem}
          onChange={(e) => setStem(e.target.value as "alida" | "akker")}
          className="border-2 border-ink bg-offwhite px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="alida">Alida</option>
          <option value="akker">Akker</option>
        </select>
        <button
          onClick={maakOudio}
          disabled={besig !== "" || !skrip.trim()}
          className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          {besig === "oudio" ? "ElevenLabs praat… (±30s)" : "3. Genereer oudio"}
        </button>
      </div>

      {mp3 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <audio controls src={mp3} className="h-9 min-w-64 flex-1" />
          <a href={mp3} download className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper">
            Laai af
          </a>
        </div>
      ) : null}
    </div>
  );
}
