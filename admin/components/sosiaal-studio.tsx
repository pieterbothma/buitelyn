"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { krySosialeTekste, laaiNuusbriefOp, type SosialeTekste } from "@/app/actions-sosiaal";
import { BufferPaneel } from "@/components/buffer-paneel";
import { haalJson } from "@/lib/haal";

const PLATFORMS: { sleutel: keyof SosialeTekste; naam: string }[] = [
  { sleutel: "x", naam: "X / Twitter" },
  { sleutel: "instagram", naam: "Instagram" },
  { sleutel: "linkedin", naam: "LinkedIn" },
  { sleutel: "whatsapp", naam: "WhatsApp-kanaal" },
];

export function SosiaalStudio({
  datum,
  stukke,
  weergawe = 0,
}: {
  datum: string;
  stukke: { kop: string; byskrif: string }[];
  weergawe?: number;
}) {
  const router = useRouter();
  const [vorm, setVorm] = useState<"vierkant" | "portret">("vierkant");
  const [oplaaiTeks, setOplaaiTeks] = useState("");
  const [oplaaiOop, setOplaaiOop] = useState(false);
  const [oplaaiBoodskap, setOplaaiBoodskap] = useState<string | null>(null);
  const [eiePrompt, setEiePrompt] = useState("");
  const [eieOpskrif, setEieOpskrif] = useState("");
  const [eieLogo, setEieLogo] = useState<"ink" | "wit" | "geen">("ink");
  const [eieGrootte, setEieGrootte] = useState("1024x1024");
  const [eieBesig, setEieBesig] = useState(false);
  const [eieFotos, setEieFotos] = useState<string[]>([]);
  const [videoBesig, setVideoBesig] = useState(false);
  const [videoBron, setVideoBron] = useState<"briefing" | "nuusbrief" | "oplaai">("briefing");
  const [videoFormaat, setVideoFormaat] = useState<"reels" | "vierkant">("reels");
  const [videoKaart, setVideoKaart] = useState(0);
  const [videoLeer, setVideoLeer] = useState<File | null>(null);
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

  function laaiOp() {
    if (!oplaaiTeks.trim()) return;
    setOplaaiBoodskap(null);
    begin(async () => {
      const n = await laaiNuusbriefOp(oplaaiTeks);
      if (n > 0) {
        setOplaaiBoodskap(`${n} kaarte gemaak — hulle verskyn nou hieronder.`);
        setOplaaiTeks("");
        setOplaaiOop(false);
        router.refresh();
      } else {
        setOplaaiBoodskap("Kon nie stukke onttrek nie — probeer weer.");
      }
    });
  }

  async function skepEieKaart() {
    if (!eiePrompt.trim()) return;
    setEieBesig(true);
    setBoodskap(null);
    try {
      const u = await haalJson<{ url?: string }>("/api/fotos/skep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: eiePrompt.trim(), size: eieGrootte, logo: eieLogo, opskrif: eieOpskrif }),
      });
      if (u.ok && u.data.url) {
        const url = u.data.url;
        setEieFotos((f) => [url, ...f]);
        setEiePrompt("");
      } else setBoodskap(u.ok ? "Kon nie skep nie." : u.fout);
    } finally {
      setEieBesig(false);
    }
  }

  async function renderVideo() {
    setVideoBesig(true);
    setVideoFout(null);
    try {
      const vorm = new FormData();
      vorm.append("bron", videoBron);
      vorm.append("formaat", videoFormaat);
      vorm.append("kaart", String(videoKaart));
      if (videoBron === "oplaai" && videoLeer) vorm.append("leer", videoLeer);
      const u = await haalJson<{ url?: string }>("/api/sosiaal/video", { method: "POST", body: vorm });
      if (u.ok) setVideoUrl(u.data.url ?? null);
      else setVideoFout(u.fout);
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
        Branded kaarte uit vandag se nuusbrief — regsklik en stoor, of maak oop en deel.
        Dit is die OUTOMATIESE stel, in een uitleg.
      </p>
      {/* Sonder hierdie wyser is die Kaart-bouer onvindbaar: dit is 'n eie blad,
          en dit is hierdie blad waarop mens instinktief soek. */}
      <Link
        href="/w/buitelyn/kaarte"
        className="mt-3 inline-block border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85"
      >
        Bou &apos;n eie kaart → Kaart-bouer
      </Link>
      <p className="mt-1 max-w-lg text-xs text-ink/50">
        Vyf style (kop + beeld, groot getal, aanhaling, lys, meme), vier groottes,
        eie foto&apos;s met snit en agtergrond-verwydering.
      </p>
      <div className="mt-3">
        {oplaaiOop ? (
          <div className="max-w-xl border-2 border-ink bg-offwhite p-4">
            <p className="text-sm font-semibold">Laai vandag se Buitelyn op</p>
            <p className="mt-0.5 text-xs text-ink/50">
              Plak die finale nuusbrief-teks — die kaarte kry koppe met kort opsommings.
            </p>
            <textarea
              value={oplaaiTeks}
              onChange={(e) => setOplaaiTeks(e.target.value)}
              rows={6}
              placeholder="Plak die nuusbrief hier…"
              className="mt-2 w-full border-2 border-ink bg-paper p-3 text-sm outline-none focus:border-red"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={laaiOp}
                disabled={besig || !oplaaiTeks.trim()}
                className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
              >
                {besig ? "Verwerk…" : "Maak kaarte →"}
              </button>
              <button
                onClick={() => setOplaaiOop(false)}
                className="px-3 py-2 text-sm font-semibold text-ink/50 hover:text-ink"
              >
                Kanselleer
              </button>
            </div>
          </div>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOplaaiOop(true)}
              className="border-2 border-ink bg-offwhite px-4 py-2 text-sm font-semibold hover:bg-paper"
            >
              Laai vandag se Buitelyn op ↑
            </button>
            {oplaaiBoodskap ? <span className="text-sm text-ink/60">{oplaaiBoodskap}</span> : null}
          </span>
        )}
      </div>
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
              href={`/api/sosiaal/kaart?datum=${datum}&i=${i}&vorm=${vorm}&v=${weergawe}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block border-2 border-ink"
              title={s.kop}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/sosiaal/kaart?datum=${datum}&i=${i}&vorm=${vorm}&v=${weergawe}`}
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
        Eie kaart
        <span aria-hidden className="size-2 rounded-full bg-red" />
      </h2>
      <p className="mt-1 max-w-lg text-sm text-ink/60">
        &apos;n Buitelyn-spotprent: swart opskrif bo, &apos;n slim spotprent van jou onderwerp
        daaronder — die logo kom outomaties in die hoek.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex border-2 border-ink">
          {([
            { w: "ink", n: "Ink-logo" },
            { w: "wit", n: "Wit-logo" },
            { w: "geen", n: "Geen logo" },
          ] as const).map((g) => (
            <button
              key={g.w}
              onClick={() => setEieLogo(g.w)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                eieLogo === g.w ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
              }`}
            >
              {g.n}
            </button>
          ))}
        </span>
        <span className="flex border-2 border-ink">
          {[
            { w: "1536x1024", n: "Landskap" },
            { w: "1024x1024", n: "Vierkant" },
            { w: "1024x1536", n: "Portret" },
          ].map((g) => (
            <button
              key={g.w}
              onClick={() => setEieGrootte(g.w)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                eieGrootte === g.w ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
              }`}
            >
              {g.n}
            </button>
          ))}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          skepEieKaart();
        }}
        className="mt-2 flex max-w-2xl flex-col gap-2"
      >
        <input
          value={eieOpskrif}
          onChange={(e) => setEieOpskrif(e.target.value)}
          placeholder="Opskrif in die beeld (swart teks bo) — opsioneel"
          className="border-2 border-ink bg-offwhite px-3 py-2 text-sm outline-none focus:border-red"
        />
        {/* 'n Textarea, nie 'n input nie: 'n spotprent-beskrywing is 'n paar
            sinne lank en op een reël rol die begin uit sig sodra jy tik — jy
            kan nie sien wat jy vra nie. Daar was nooit 'n karakterlimiet nie,
            net te min plek. resize-y laat 'n mens dit self groter trek. */}
        <textarea
          value={eiePrompt}
          onChange={(e) => setEiePrompt(e.target.value)}
          rows={4}
          placeholder="Waaroor gaan die spotprent? (bv. Kganyago hou die rentekoers-hek toe terwyl die rand wegloop)"
          className="w-full resize-y border-2 border-ink bg-offwhite px-3 py-2 text-sm leading-relaxed outline-none focus:border-red"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={eieBesig || !eiePrompt.trim()}
            className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
          >
            {eieBesig ? "Skep… (±30s)" : "Skep spotprent"}
          </button>
          <span className="text-xs text-ink/50">{eiePrompt.trim().length} karakters</span>
        </div>
      </form>
      {eieFotos.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eieFotos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group block border-2 border-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Eie kaart" className="w-full group-hover:opacity-90" />
            </a>
          ))}
        </div>
      ) : null}

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
        Die dag se briefing-audio oor die voorbladkaart met &apos;n golfvorm — gerender in &apos;n
        Vercel Sandbox.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex border-2 border-ink">
          {([
            { w: "briefing", n: "Dagoorsig" },
            { w: "nuusbrief", n: "Nuusbrief-audio" },
            { w: "oplaai", n: "Laai audio op" },
          ] as const).map((g) => (
            <button
              key={g.w}
              onClick={() => setVideoBron(g.w)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                videoBron === g.w ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
              }`}
            >
              {g.n}
            </button>
          ))}
        </span>
        {stukke.length > 1 ? (
          <select
            value={videoKaart}
            onChange={(e) => setVideoKaart(Number(e.target.value))}
            className="border-2 border-ink bg-offwhite px-2 py-1.5 text-xs font-semibold"
          >
            {stukke.map((s, i) => (
              <option key={i} value={i}>
                {i === 0 ? "Voorblad: " : ""}{s.kop.slice(0, 40)}
              </option>
            ))}
          </select>
        ) : null}
        <span className="flex border-2 border-ink">
          {([
            { w: "reels", n: "Reels (9:16)" },
            { w: "vierkant", n: "Vierkant (1:1)" },
          ] as const).map((g) => (
            <button
              key={g.w}
              onClick={() => setVideoFormaat(g.w)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                videoFormaat === g.w ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
              }`}
            >
              {g.n}
            </button>
          ))}
        </span>
        {videoBron === "oplaai" ? (
          <label className="cursor-pointer border-2 border-dashed border-ink bg-offwhite px-3 py-1.5 text-xs font-semibold hover:bg-paper">
            {videoLeer ? videoLeer.name.slice(0, 30) : "Kies MP3…"}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setVideoLeer(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={renderVideo}
          disabled={videoBesig || (videoBron === "oplaai" && !videoLeer)}
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

      <BufferPaneel
        datum={datum}
        stukke={stukke.map((s, i) => ({ i, kop: s.kop }))}
        vorm={vorm}
        weergawe={weergawe}
      />
    </div>
  );
}
