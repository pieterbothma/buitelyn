"use client";

import { useState } from "react";

type Pos = { title: string; url: string; teks: string };

export function AudioStudio({ posts }: { posts: Pos[] }) {
  const [gekies, setGekies] = useState<Pos | null>(null);
  const [teks, setTeks] = useState("");
  const [status, setStatus] = useState<"idle" | "besig" | "klaar" | "fout">("idle");
  const [mp3, setMp3] = useState<string | null>(null);
  const [fout, setFout] = useState("");

  async function genereer() {
    if (!gekies) return;
    setStatus("besig");
    const res = await fetch("/api/audio/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titel: gekies.title, teks, bron_url: gekies.url }),
    });
    const data = await res.json();
    if (res.ok) {
      setMp3(data.mp3);
      setStatus("klaar");
    } else {
      setFout(data.fout ?? "onbekende fout");
      setStatus("fout");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <ul className="max-h-[70vh] divide-y divide-ink/10 self-start overflow-y-auto border-2 border-ink bg-offwhite">
        {posts.map((p) => (
          <li key={p.url}>
            <button
              onClick={() => {
                setGekies(p);
                setTeks(p.teks);
                setStatus("idle");
                setMp3(null);
              }}
              className={`w-full px-3 py-2.5 text-left text-sm font-semibold hover:bg-paper ${
                gekies?.url === p.url ? "bg-paper" : ""
              }`}
            >
              {p.title}
            </button>
          </li>
        ))}
      </ul>

      <div className="border-2 border-ink bg-offwhite p-5">
        {gekies ? (
          <>
            <h2 className="font-extrabold">{gekies.title}</h2>
            <p className="mt-1 text-xs text-ink/50">
              Redigeer die teks (haal groete/voetnotas uit) voor jy genereer — {teks.length} karakters.
            </p>
            <textarea
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              rows={16}
              className="mt-3 w-full border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
            />
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={genereer}
                disabled={status === "besig"}
                className="bg-ink px-6 py-2.5 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
              >
                {status === "besig" ? "Genereer… (kan 'n minuut vat)" : "Genereer oudio →"}
              </button>
              {status === "fout" ? <p className="text-sm font-semibold text-red">{fout}</p> : null}
            </div>
            {status === "klaar" && mp3 ? (
              <div className="mt-4 border-2 border-green p-4">
                <audio controls src={mp3} className="w-full" />
                <a href={mp3} download className="mt-2 inline-block text-sm font-semibold underline">
                  Laai MP3 af ↓
                </a>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-ink/50">Kies 'n nuusbrief links.</p>
        )}
      </div>
    </div>
  );
}
