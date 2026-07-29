"use client";

import { useState } from "react";
import { skepOorsig, stoorOorsig, kryOorsigVirDag, type StudioOorsig } from "@/app/actions-oorsig";
import { verwerkTeksVirAudio } from "@/app/actions-audio";
import { useOutostoor, WeergawePaneel } from "@/components/outostoor";

const datumFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function OorsigStudio({ argief, vandag }: { argief: StudioOorsig[]; vandag: string }) {
  const [datum, setDatum] = useState(vandag);
  const [teks, setTeks] = useState(argief.find((a) => a.datum === vandag)?.teks ?? "");
  const [besig, setBesig] = useState<"" | "genereer" | "stoor" | "verwerk" | "audio">("");
  const [boodskap, setBoodskap] = useState("");
  const [audioTeks, setAudioTeks] = useState("");
  const [mp3, setMp3] = useState<string | null>(null);
  const outoStatus = useOutostoor("oorsig", datum, teks, setTeks);

  const laaiDag = async (d: string) => {
    if (d === datum) return; // moenie die huidige redigeerder oorskryf nie
    setDatum(d);
    setAudioTeks("");
    setMp3(null);
    setBoodskap("Laai…");
    const vars = await kryOorsigVirDag(d); // vars uit die DB — die prop is dalk verouderd
    setTeks(vars ?? argief.find((a) => a.datum === d)?.teks ?? "");
    setBoodskap("");
  };

  const genereer = async () => {
    setBesig("genereer");
    setBoodskap("");
    try {
      const t = await skepOorsig();
      if (t) setTeks(t);
      else setBoodskap("Kon nie genereer nie — probeer weer.");
    } finally {
      setBesig("");
    }
  };

  const stoor = async () => {
    setBesig("stoor");
    try {
      await stoorOorsig(teks, datum);
      setBoodskap("Gestoor.");
    } finally {
      setBesig("");
    }
  };

  const verwerk = async () => {
    setBesig("verwerk");
    setBoodskap("");
    try {
      const t = await verwerkTeksVirAudio(teks);
      if (t) setAudioTeks(t);
      else setBoodskap("Verwerking het misluk.");
    } finally {
      setBesig("");
    }
  };

  const maakAudio = async () => {
    setBesig("audio");
    setBoodskap("");
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titel: `Oorsig ${datum}`, teks: audioTeks || teks, bron_url: "" }),
      });
      const d = await res.json();
      if (res.ok) setMp3(d.mp3);
      else setBoodskap(d.fout ?? "Audio het misluk.");
    } finally {
      setBesig("");
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {datum === vandag ? (
            <button
              onClick={genereer}
              disabled={besig !== ""}
              className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
            >
              {besig === "genereer" ? "Gemini skryf…" : teks ? "Genereer oor" : "Genereer vandag se oorsig"}
            </button>
          ) : (
            <p className="text-sm text-ink/60">{datumFmt.format(new Date(`${datum}T12:00:00Z`))} se oorsig</p>
          )}
          {teks ? (
            <>
              <button
                onClick={stoor}
                disabled={besig !== ""}
                className="border-2 border-ink px-4 py-2 text-sm font-semibold hover:bg-paper disabled:opacity-50"
              >
                {besig === "stoor" ? "Stoor…" : "Stoor"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(teks);
                  setBoodskap("Gekopieer.");
                }}
                className="border-2 border-ink px-4 py-2 text-sm font-semibold hover:bg-paper"
              >
                Kopieer
              </button>
            </>
          ) : null}
          <WeergawePaneel tipe="oorsig" datum={datum} opHerstel={setTeks} />
          {boodskap || outoStatus ? (
            <span className="text-sm text-ink/60">{boodskap || outoStatus}</span>
          ) : null}
        </div>

        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          rows={12}
          placeholder="Genereer die oorsig, of skryf/plak self…"
          className="w-full border-2 border-ink bg-white p-4 text-[15px] leading-relaxed outline-none focus:border-red"
        />

        {teks ? (
          <div className="border-2 border-ink bg-offwhite p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink/60">
              AUDIO 🎙
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={verwerk}
                disabled={besig !== ""}
                className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50"
              >
                {besig === "verwerk" ? "Verwerk…" : "1. Verwerk teks vir audio"}
              </button>
              <button
                onClick={maakAudio}
                disabled={besig !== "" || (!audioTeks && !teks)}
                className="bg-ink px-3 py-1.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
              >
                {besig === "audio" ? "ElevenLabs praat…" : "2. Genereer audio"}
              </button>
            </div>
            {audioTeks ? (
              <textarea
                value={audioTeks}
                onChange={(e) => setAudioTeks(e.target.value)}
                rows={8}
                className="mt-3 w-full border border-ink/30 bg-white p-3 text-sm leading-relaxed outline-none focus:border-red"
              />
            ) : null}
            {mp3 ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={mp3} className="h-9 min-w-64 flex-1" />
                <a href={mp3} download className="border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-paper">
                  Laai af
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="border-2 border-ink bg-offwhite">
        <h2 className="border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.14em]">ARGIEF</h2>
        <ul className="divide-y divide-ink/10">
          {(() => {
            // laaste 10 dae altyd klikbaar, plus enige ouer gestoorde dae
            const dae = Array.from({ length: 10 }, (_, i) => {
              const t = new Date(`${vandag}T12:00:00Z`);
              t.setUTCDate(t.getUTCDate() - i);
              return t.toISOString().slice(0, 10);
            });
            for (const a of argief) if (!dae.includes(a.datum)) dae.push(a.datum);
            return dae;
          })().map((d) => (
            <li key={d}>
              <button
                onClick={() => laaiDag(d)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-paper ${
                  datum === d ? "bg-paper font-semibold" : ""
                }`}
              >
                {datumFmt.format(new Date(`${d}T12:00:00Z`))}
                {argief.some((a) => a.datum === d) ? (
                  <span aria-hidden className="size-1.5 rounded-full bg-green" />
                ) : d === vandag ? (
                  <span className="text-xs text-ink/40">vandag</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
