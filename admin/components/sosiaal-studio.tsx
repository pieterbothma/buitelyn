"use client";

import { useState, useTransition } from "react";
import { krySosialeTekste, type SosialeTekste } from "@/app/actions-sosiaal";

const PLATFORMS: { sleutel: keyof SosialeTekste; naam: string }[] = [
  { sleutel: "x", naam: "X / Twitter" },
  { sleutel: "instagram", naam: "Instagram" },
  { sleutel: "linkedin", naam: "LinkedIn" },
  { sleutel: "whatsapp", naam: "WhatsApp-kanaal" },
];

export function SosiaalStudio({
  datum,
  stukke,
}: {
  datum: string;
  stukke: { kop: string; byskrif: string }[];
}) {
  const [vorm, setVorm] = useState<"vierkant" | "portret">("vierkant");
  const [videoBesig, setVideoBesig] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFout, setVideoFout] = useState<string | null>(null);
  const [tekste, setTekste] = useState<SosialeTekste | null>(null);
  const [boodskap, setBoodskap] = useState<string | null>(null);
  const [besig, begin] = useTransition();

  function haalTekste() {
    begin(async () => {
      const t = await krySosialeTekste();
      setTekste(t);
      if (!t) setBoodskap("Genereer eers vandag se konsep.");
    });
  }

  async function renderVideo() {
    setVideoBesig(true);
    setVideoFout(null);
    try {
      const res = await fetch("/api/sosiaal/video", { method: "POST" });
      const data = await res.json();
      if (res.ok) setVideoUrl(data.url);
      else setVideoFout(data.fout ?? "Render het misluk.");
    } catch {
      setVideoFout("Netwerkfout.");
    } finally {
      setVideoBesig(false);
    }
  }

  async function kopieer(teks: string, naam: string) {
    await navigator.clipboard.writeText(teks);
    setBoodskap(`${naam} gekopieer.`);
  }

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
        Poskaarte
        <span aria-hidden className="size-2 rounded-full bg-red" />
      </h2>
      <p className="mt-1 max-w-lg text-sm text-ink/60">
        Branded kaarte uit vandag se konsep — regsklik en stoor, of maak oop en deel.
      </p>
      <div className="mt-3 flex border-2 border-ink self-start w-fit">
        {(["vierkant", "portret"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVorm(v)}
            className={`px-3 py-1.5 text-xs font-semibold ${
              vorm === v ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
            }`}
          >
            {v === "vierkant" ? "Vierkant (1:1)" : "Portret (4:5)"}
          </button>
        ))}
      </div>

      {stukke.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stukke.map((s, i) => (
            <a
              key={i}
              href={`/api/sosiaal/kaart?datum=${datum}&i=${i}&vorm=${vorm}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block border-2 border-ink"
              title={s.kop}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/sosiaal/kaart?datum=${datum}&i=${i}&vorm=${vorm}`}
                alt={s.kop}
                className="w-full group-hover:opacity-90"
              />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink/50">Genereer eers vandag se konsep in die Studio.</p>
      )}

      <h2 className="mt-10 flex items-center gap-2 border-t-2 border-ink pt-6 text-lg font-extrabold tracking-tight">
        Plasing-tekste
        <span aria-hidden className="size-2 rounded-full bg-red" />
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={haalTekste}
          disabled={besig}
          className="h-10 bg-ink px-4 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          {besig ? "Skryf…" : tekste ? "Skryf oor" : "Skryf vandag se plasings"}
        </button>
        {boodskap ? <span className="text-sm text-ink/60">{boodskap}</span> : null}
      </div>
      {tekste ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {PLATFORMS.map((p) => (
            <div key={p.sleutel} className="flex flex-col border-2 border-ink bg-offwhite">
              <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2">
                <span className="text-xs font-semibold tracking-[0.14em]">{p.naam.toUpperCase()}</span>
                <button
                  onClick={() => kopieer(tekste[p.sleutel], p.naam)}
                  className="text-xs font-semibold underline-offset-2 hover:underline"
                >
                  Kopieer
                </button>
              </div>
              <p className="whitespace-pre-wrap p-4 text-sm leading-relaxed">{tekste[p.sleutel]}</p>
            </div>
          ))}
        </div>
      ) : null}

      <h2 className="mt-10 flex items-center gap-2 border-t-2 border-ink pt-6 text-lg font-extrabold tracking-tight">
        Video
        <span aria-hidden className="size-2 rounded-full bg-red" />
      </h2>
      <p className="mt-1 max-w-lg text-sm text-ink/60">
        Die dag se briefing-audio oor die voorbladkaart met 'n golfvorm — gerender in 'n
        Vercel Sandbox.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={renderVideo}
          disabled={videoBesig}
          className="h-11 bg-ink px-5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
        >
          {videoBesig ? "Render… (±2 min)" : "Render audiogram →"}
        </button>
        {videoFout ? <span className="text-sm font-semibold text-red">{videoFout}</span> : null}
      </div>
      {videoUrl ? (
        <div className="mt-4 max-w-md border-2 border-green p-3">
          <video controls src={videoUrl} className="w-full" />
          <a href={videoUrl} download className="mt-1.5 inline-block text-sm font-semibold underline">
            Laai MP4 af ↓
          </a>
        </div>
      ) : null}
    </div>
  );
}
