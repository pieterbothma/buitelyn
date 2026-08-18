"use client";

import { useEffect, useRef, useState } from "react";
import type { Artikel } from "@/lib/nuuspod";

const tydFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/* 'n Klik maak die storie in 'n oorlegvenster oop, nie in die ry self nie.
   Inlyn oopvou het alles onder die storie afgestoot en jou plek in 'n lys van
   114 items laat verloor — jy moes elke keer terugsoek waar jy was.

   Die venster gaan toe met Escape, met 'n klik op die agtergrond, en met die
   knoppie. Al drie, want 'n mens gryp na verskillende dinge. */
export function NuusLys({ artikels }: { artikels: Artikel[] }) {
  const [oop, setOop] = useState<Artikel | null>(null);
  const sluitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!oop) return;
    const opToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOop(null);
    };
    document.addEventListener("keydown", opToets);
    /* Hou die agtergrondlys stil terwyl 'n mens lees, anders rol die blad
       agter die venster weg wanneer die muiswiel die einde van die teks haal. */
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sluitRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", opToets);
      document.body.style.overflow = vorige;
    };
  }, [oop]);

  return (
    <>
      <ul className="mt-4 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
        {artikels.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => setOop(a)}
              className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-paper"
            >
              {/* Gewone <img>, nie next/image nie: die prente kom van 19
                  nuusdomeine en elkeen sou 'n remotePatterns-inskrywing verg.
                  'n Stukkende skakel versteek homself eerder as om 'n
                  gebreekte ikoon te wys. */}
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.imageUrl}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="h-16 w-24 shrink-0 border border-ink/15 object-cover"
                />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{a.headline}</span>
                {a.summary ? (
                  <span className="mt-1 block text-[13px] text-ink/60">{a.summary}</span>
                ) : null}
                <span className="mt-1 block text-xs text-ink/40">
                  {a.publishedAt ? tydFmt.format(new Date(a.publishedAt)) : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {oop ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={oop.headline}
          onClick={() => setOop(null)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 md:p-10"
        >
          {/* Die klik op die agtergrond maak toe; binne die venster mag 'n
              klik niks doen nie, anders gaan dit toe wanneer jy teks kies. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl border-2 border-ink bg-offwhite"
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink/15 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">{oop.headline}</h2>
                <p className="mt-1 text-xs text-ink/45">
                  {oop.sourceName}
                  {oop.publishedAt ? ` · ${tydFmt.format(new Date(oop.publishedAt))}` : ""}
                </p>
              </div>
              <button
                ref={sluitRef}
                onClick={() => setOop(null)}
                aria-label="Maak toe"
                className="shrink-0 border-2 border-ink px-3 py-1 text-sm font-semibold hover:bg-paper"
              >
                Sluit
              </button>
            </div>

            <div className="px-5 py-5">
              {oop.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={oop.imageUrl}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="mb-4 max-h-96 w-full border border-ink/15 object-cover"
                />
              ) : null}
              {oop.body ? (
                oop.body
                  .split(/\n\s*\n/)
                  .filter((p) => p.trim())
                  .map((para, i) => (
                    <p key={i} className="mt-3 max-w-[70ch] text-[15px] leading-relaxed first:mt-0">
                      {para.trim()}
                    </p>
                  ))
              ) : (
                <p className="text-[13px] text-ink/50">
                  Hierdie storie het geen volteks nie — net die opsomming.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
