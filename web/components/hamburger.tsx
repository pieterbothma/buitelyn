"use client";

import { useState } from "react";

const SKAKELS: { naam: string; href: string; sub?: boolean; ekstern?: boolean }[] = [
  { naam: "Markte", href: "/markte" },
  { naam: "Bewegers", href: "/markte?blad=bewegers", sub: true },
  { naam: "Liga", href: "/markte?blad=liga", sub: true },
  { naam: "SENS", href: "/markte?blad=sens", sub: true },
  { naam: "Telegram", href: "/markte?blad=telegram", sub: true },
  { naam: "Winkel", href: "https://buitelyn-shop.fourthwall.com/", ekstern: true },
  { naam: "Nuusbrief", href: "https://buitelyn.substack.com/subscribe", ekstern: true },
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
                  className={`block px-6 py-3 text-[15px] font-semibold hover:bg-paper ${
                    s.sub ? "pl-10 text-ink/70" : ""
                  }`}
                >
                  {s.sub ? "· " : ""}
                  {s.naam}
                  {s.ekstern ? " ↗" : ""}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
