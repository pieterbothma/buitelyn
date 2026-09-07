"use client";

import { useState } from "react";

/* 'n Fasade, nie 'n ingebedde speler nie.

   YouTube se iframe sleep ±1 MB JavaScript en 'n string koekies saam op ELKE
   tuisbladlaai, ook vir die meeste besoekers wat nooit druk nie. Ons wys dus
   YouTube se eie duimnael met 'n speelknoppie, en ruil dit eers op 'n klik vir
   die regte raam uit. Dan speel dit dadelik, want die klik is die toestemming.

   youtube-nocookie.com: dieselfde speler, maar YouTube plant eers 'n koekie
   wanneer daar gespeel word. */
export function VideoSpeler({
  id,
  titel,
  duimnael,
}: {
  id: string;
  titel: string;
  duimnael: string;
}) {
  const [speel, setSpeel] = useState(false);
  const [prent, setPrent] = useState(duimnael);

  if (speel) {
    return (
      <div className="relative aspect-video w-full border-2 border-ink bg-ink">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={titel}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setSpeel(true)}
      aria-label={`Speel: ${titel}`}
      className="group relative block aspect-video w-full overflow-hidden border-2 border-ink bg-ink"
    >
      {/* Gewone <img>: i.ytimg.com sou 'n remotePatterns-inskrywing verg, en
          maxresdefault bestaan nie vir elke video nie — dan val ons na
          hqdefault terug, wat altyd daar is. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={prent}
        alt=""
        onError={() => setPrent(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
        className="h-full w-full object-cover transition group-hover:opacity-90"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-red transition group-hover:scale-105">
          <span className="ml-1.5 border-y-[14px] border-l-[24px] border-y-transparent border-l-offwhite" />
        </span>
      </span>
    </button>
  );
}
