"use client";

import { useState } from "react";
import type { Artikel } from "@/lib/nuuspod";

const tydFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/* Klik 'n storie oop om dit heeltemal te lees. Dis 'n leesblad vir Piet self,
   nie 'n aanstuur-instrument nie — daarom geen knoppies langs elke ry nie.
   Die volle teks is reeds in die antwoord, dus kos die oopmaak niks. */
export function NuusLys({ artikels }: { artikels: Artikel[] }) {
  const [oop, setOop] = useState<string | null>(null);

  return (
    <ul className="mt-4 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
      {artikels.map((a) => {
        const isOop = oop === a.id;
        return (
          <li key={a.id}>
            <button
              onClick={() => setOop(isOop ? null : a.id)}
              aria-expanded={isOop}
              className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-paper"
            >
              {/* Gewone <img>, nie next/image nie: die prente kom van 19
                  verskillende nuusdomeine en elkeen sou 'n inskrywing in
                  next.config se remotePatterns verg. 'n Stukkende skakel
                  versteek homself eerder as om 'n gebreekte ikoon te wys. */}
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
                {!isOop && a.summary ? (
                  <span className="mt-1 block text-[13px] text-ink/60">{a.summary}</span>
                ) : null}
                <span className="mt-1 block text-xs text-ink/40">
                  {a.publishedAt ? tydFmt.format(new Date(a.publishedAt)) : ""}
                </span>
              </span>
            </button>

            {isOop ? (
              <div className="px-3 pb-4">
                {a.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.imageUrl}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className="mb-3 max-h-96 w-full max-w-[70ch] border border-ink/15 object-cover"
                  />
                ) : null}
                {/* Die body kom as gewone teks met leë reëls tussen paragrawe. */}
                {a.body ? (
                  a.body
                    .split(/\n\s*\n/)
                    .filter((p) => p.trim())
                    .map((para, i) => (
                      <p key={i} className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed">
                        {para.trim()}
                      </p>
                    ))
                ) : (
                  <p className="mt-3 text-[13px] text-ink/50">
                    Hierdie storie het geen volteks nie — net die opsomming hier bo.
                  </p>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
