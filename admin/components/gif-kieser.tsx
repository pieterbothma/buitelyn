"use client";

import { useEffect, useRef, useState } from "react";
import { klipyConfigured, soekKlipy, type Gif, type Media } from "@/lib/klipy";

/* GIF-/meme-kieser. Volg die AudioModal-patroon in konsep-studio.tsx: vaste
   oorlegger, klik-buite om toe te maak, stopPropagation op die binneboks.

   Roep Klipy DIREK uit die blaaier — hul integrasievoorwaardes verbied 'n
   bedienerproxy, en die sleutel in die pad is 'n kliënt-sleutel, nie 'n
   geheim nie. Sien lib/klipy.ts. */

const TABBE: { media: Media; naam: string }[] = [
  { media: "gifs", naam: "GIF's" },
  { media: "static-memes", naam: "Memes" },
];

/** Stabiele, anonieme id vir Klipy se trending/recent-logika. Dit hoef nie ons
 *  auth-id te wees nie — net konsekwent per blaaier. */
function klantId(): string {
  const sleutel = "buitelyn-klipy-klant";
  let id = localStorage.getItem(sleutel);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(sleutel, id);
  }
  return id;
}

export function GifKieser({
  opKies,
  toe,
  media: aanvanklikeMedia = "gifs",
}: {
  opKies: (gif: Gif, media: Media) => void;
  toe: () => void;
  media?: Media;
}) {
  const [media, setMedia] = useState<Media>(aanvanklikeMedia);
  const [navraag, setNavraag] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [bladsy, setBladsy] = useState(1);
  const [nogMeer, setNogMeer] = useState(false);
  const [besig, setBesig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [gekopieer, setGekopieer] = useState<string | null>(null);
  const afbreek = useRef<AbortController | null>(null);

  useEffect(() => {
    const tik = setTimeout(() => {
      setBladsy(1);
      laai(navraag, media, 1, false);
    }, 300);
    return () => clearTimeout(tik);
  }, [navraag, media]);

  useEffect(() => () => afbreek.current?.abort(), []);

  async function laai(q: string, m: Media, bl: number, aanheg: boolean) {
    if (!klipyConfigured()) {
      setFout("NEXT_PUBLIC_KLIPY_API_KEY is nie gestel nie.");
      setBesig(false);
      return;
    }
    afbreek.current?.abort();
    const beheer = new AbortController();
    afbreek.current = beheer;
    setBesig(true);
    setFout(null);
    try {
      const data = await soekKlipy(
        { media: m, navraag: q, bladsy: bl, klant: klantId() },
        beheer.signal
      );
      setGifs((vorige) => (aanheg ? [...vorige, ...data.gifs] : data.gifs));
      setNogMeer(data.nogMeer);
    } catch (e) {
      // 'n Afgebreekte soektog is nie 'n fout nie — 'n nuwe een is onderweg.
      if ((e as Error)?.name !== "AbortError") {
        setFout(e instanceof Error ? e.message : "Netwerkfout.");
      }
    } finally {
      if (!beheer.signal.aborted) setBesig(false);
    }
  }

  async function kopieer(gif: Gif) {
    await navigator.clipboard.writeText(gif.volledig);
    setGekopieer(gif.id);
    setTimeout(() => setGekopieer(null), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={toe}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col border-2 border-ink bg-offwhite p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex border-2 border-ink">
            {TABBE.map((t) => (
              <button
                key={t.media}
                onClick={() => setMedia(t.media)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  media === t.media ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
                }`}
              >
                {t.naam}
              </button>
            ))}
          </div>
          <button onClick={toe} className="text-sm font-semibold text-ink/50 hover:text-ink">
            Maak toe ✕
          </button>
        </div>

        {/* "Search KLIPY" as plekhouer is VERPLIGTE erkenning onder Klipy se
            integrasievoorwaardes — moenie dit vertaal nie. */}
        <input
          autoFocus
          value={navraag}
          onChange={(e) => setNavraag(e.target.value)}
          placeholder="Search KLIPY"
          className="mt-3 h-11 w-full border-2 border-ink bg-paper px-3 text-sm outline-none focus:border-red"
        />

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {fout ? (
            <p className="py-8 text-center text-sm font-semibold text-red">{fout}</p>
          ) : gifs.length === 0 && besig ? (
            <p className="py-8 text-center text-sm text-ink/60">Laai…</p>
          ) : gifs.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/60">Niks gevind nie.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {gifs.map((gif) => (
                <div key={gif.id} className="relative border-2 border-ink bg-paper">
                  <button onClick={() => opKies(gif, media)} title={gif.titel} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.voorskou}
                      alt={gif.titel}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                  <button
                    onClick={() => kopieer(gif)}
                    title="Kopieer skakel"
                    className="absolute right-1 top-1 border-2 border-ink bg-offwhite px-1.5 py-0.5 text-xs font-semibold hover:bg-paper"
                  >
                    {gekopieer === gif.id ? "✓" : "⧉"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {nogMeer && !fout ? (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => {
                  const volgende = bladsy + 1;
                  setBladsy(volgende);
                  laai(navraag, media, volgende, true);
                }}
                disabled={besig}
                className="border-2 border-ink bg-offwhite px-4 py-2 text-sm font-semibold hover:bg-paper disabled:opacity-50"
              >
                {besig ? "Laai…" : "Wys meer"}
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-3 shrink-0 text-xs text-ink/50">
          {"Klik om in te voeg · ⧉ kopieer net die skakel · Powered by KLIPY"}
        </p>
      </div>
    </div>
  );
}
