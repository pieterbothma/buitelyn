"use client";

import { useRouter } from "next/navigation";
import type { Artikel } from "@/lib/nuuspod";

const tydFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function NuusLys({ artikels }: { artikels: Artikel[] }) {
  const router = useRouter();

  /* sessionStorage, NIE 'n URL-parameter nie: 'n artikel se body is duisende
     karakters en blaaiers en instaanbedieners kap URL's lank voor dit. NIBS
     lees dit een keer en vee dit dan uit. */
  const naNibs = (a: Artikel) => {
    try {
      sessionStorage.setItem("nibs-bronteks", a.body);
    } catch {
      /* privaat modus ens. */
    }
    router.push("/w/buitelyn/nibs");
  };

  return (
    <ul className="mt-4 divide-y divide-ink/10 border-2 border-ink bg-offwhite">
      {artikels.map((a) => (
        <li key={a.id} className="flex flex-wrap items-start gap-3 p-3">
          <div className="min-w-64 flex-1">
            <p className="text-sm font-semibold">{a.headline}</p>
            {a.summary ? <p className="mt-1 text-[13px] text-ink/60">{a.summary}</p> : null}
            <p className="mt-1 text-xs text-ink/40">
              {a.publishedAt ? tydFmt.format(new Date(a.publishedAt)) : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={a.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-ink px-3 py-1.5 text-[13px] font-semibold hover:bg-paper"
            >
              Bron →
            </a>
            <button
              onClick={() => naNibs(a)}
              disabled={!a.body}
              title={a.body ? "" : "Hierdie storie het geen volteks nie"}
              className="bg-ink px-3 py-1.5 text-[13px] font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-40"
            >
              Na Nibs →
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
