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
              className="w-full px-3 py-3 text-left hover:bg-paper"
            >
              <p className="text-sm font-semibold">{a.headline}</p>
              {!isOop && a.summary ? (
                <p className="mt-1 text-[13px] text-ink/60">{a.summary}</p>
              ) : null}
              <p className="mt-1 text-xs text-ink/40">
                {a.publishedAt ? tydFmt.format(new Date(a.publishedAt)) : ""}
              </p>
            </button>

            {isOop ? (
              <div className="px-3 pb-4">
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
