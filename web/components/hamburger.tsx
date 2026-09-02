"use client";

import { useState } from "react";

/* Ikone: minimale 16px stroke-SVG's (Lucide-styl) — geen emoji's nie. */
function Ikoon({ naam }: { naam: string }) {
  const eienskappe = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (naam) {
    case "markte": // grafiek-lyn
      return (
        <svg {...eienskappe}>
          <path d="M3 3v18h18" />
          <path d="m7 15 4-6 3 3 5-7" />
        </svg>
      );
    case "portefeulje": // beursie
      return (
        <svg {...eienskappe}>
          <rect x="3" y="7" width="18" height="13" rx="1" />
          <path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
          <path d="M17 13h2" />
        </svg>
      );
    case "bewegers": // pyle op/af
      return (
        <svg {...eienskappe}>
          <path d="m8 6 4-4 4 4" />
          <path d="M12 2v20" />
        </svg>
      );
    case "liga": // trofee
      return (
        <svg {...eienskappe}>
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v6a5 5 0 0 1-10 0Z" />
          <path d="M17 5h3a2 2 0 0 1-2 4" />
          <path d="M7 5H4a2 2 0 0 0 2 4" />
        </svg>
      );
    case "sens": // dokument
      return (
        <svg {...eienskappe}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      );
    case "sakgeld": // sakrekenaar
      return (
        <svg {...eienskappe}>
          <rect x="5" y="2" width="14" height="20" rx="1" />
          <path d="M8 6h8" />
          <path d="M8 12h.01" />
          <path d="M12 12h.01" />
          <path d="M16 12h.01" />
          <path d="M8 16h.01" />
          <path d="M12 16h.01" />
          <path d="M16 16h.01" />
        </svg>
      );
    case "telegram": // stuur-vliegtuigie
      return (
        <svg {...eienskappe}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );
    case "winkel": // sak
      return (
        <svg {...eienskappe}>
          <path d="M6 7h12l1 14H5Z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
      );
    case "nuusbrief": // koevert
      return (
        <svg {...eienskappe}>
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    default:
      return null;
  }
}

const SKAKELS: { naam: string; href: string; ikoon: string; sub?: boolean; ekstern?: boolean }[] = [
  { naam: "Markte", href: "/markte", ikoon: "markte" },
  { naam: "Portefeulje", href: "/markte?blad=portefeulje", ikoon: "portefeulje", sub: true },
  { naam: "Bewegers", href: "/markte?blad=bewegers", ikoon: "bewegers", sub: true },
  { naam: "Beursliga", href: "/markte?blad=liga", ikoon: "liga", sub: true },
  { naam: "Sakgeld", href: "/markte?blad=sakgeld", ikoon: "sakgeld", sub: true },
  { naam: "SENS", href: "/markte?blad=sens", ikoon: "sens", sub: true },
  { naam: "Telegram", href: "/markte?blad=telegram", ikoon: "telegram", sub: true },
  { naam: "Winkel", href: "/winkel", ikoon: "winkel" },
  { naam: "Nuusbrief", href: "https://buitelyn.substack.com/subscribe", ikoon: "nuusbrief", ekstern: true },
];

/** Mobiele nav: hamburger met die markte-oortjies as sub-skakels. */
export function Hamburger() {
  const [oop, setOop] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOop(!oop)}
        aria-label="Kieslys"
        aria-expanded={oop}
        className="flex size-9 flex-col items-center justify-center gap-1.5 border-2 border-ink"
      >
        <span className={`h-0.5 w-4 bg-ink transition-transform ${oop ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`h-0.5 w-4 bg-ink ${oop ? "opacity-0" : ""}`} />
        <span className={`h-0.5 w-4 bg-ink transition-transform ${oop ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>
      {oop ? (
        <nav className="absolute inset-x-0 top-full z-50 border-b-2 border-t border-ink bg-offwhite shadow-lg">
          <ul className="divide-y divide-ink/10">
            {SKAKELS.map((s) => (
              <li key={s.naam}>
                <a
                  href={s.href}
                  onClick={() => setOop(false)}
                  {...(s.ekstern ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`flex items-center gap-3 px-6 py-3 text-[15px] font-semibold hover:bg-paper ${
                    s.sub ? "pl-12 text-ink/70" : ""
                  }`}
                >
                  <Ikoon naam={s.ikoon} />
                  {s.naam}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
