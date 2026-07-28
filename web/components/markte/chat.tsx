"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Belegging } from "@/components/markte/portefeulje";

type Boodskap = { rol: "gebruiker" | "buitelyn"; teks: string };

/* Maak [teks](url)-skakels én kaal URL's klikbaar; res bly gewone teks. */
const MD_SKAKEL = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const KAAL_URL = /https?:\/\/[^\s)]+/g;

function Skakel({ href, teks }: { href: string; teks: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-2 hover:text-red"
    >
      {teks}
    </a>
  );
}

function linkifiseer(teks: string): ReactNode[] {
  const dele: ReactNode[] = [];
  let sleutel = 0;
  const kaal = (stuk: string) => {
    let laaste = 0;
    for (const m of stuk.matchAll(KAAL_URL)) {
      if (m.index! > laaste) dele.push(stuk.slice(laaste, m.index));
      dele.push(<Skakel key={sleutel++} href={m[0]} teks={m[0].replace(/^https?:\/\//, "").slice(0, 40)} />);
      laaste = m.index! + m[0].length;
    }
    if (laaste < stuk.length) dele.push(stuk.slice(laaste));
  };
  let laaste = 0;
  for (const m of teks.matchAll(MD_SKAKEL)) {
    if (m.index! > laaste) kaal(teks.slice(laaste, m.index));
    dele.push(<Skakel key={sleutel++} href={m[2]} teks={m[1]} />);
    laaste = m.index! + m[0].length;
  }
  if (laaste < teks.length) kaal(teks.slice(laaste));
  return dele;
}

const VOORSTELLE = [
  "Hoekom is die rand vandag sterker of swakker?",
  "Verduidelik my portefeulje se dag",
  "Hoe lyk goud teenoor die JSE hierdie maand?",
  "Wat skryf Buitelyn oor markte?",
];

export function MarkteChat({ portefeulje }: { portefeulje: Belegging[] }) {
  const [boodskappe, setBoodskappe] = useState<Boodskap[]>([]);
  const [teks, setTeks] = useState("");
  const [besig, setBesig] = useState(false);
  const [af, setAf] = useState(false);
  const einde = useRef<HTMLDivElement>(null);

  async function stuur(vraag: string) {
    if (!vraag.trim() || besig) return;
    const nuwe: Boodskap[] = [...boodskappe, { rol: "gebruiker", teks: vraag }];
    setBoodskappe(nuwe);
    setTeks("");
    setBesig(true);
    try {
      const res = await fetch("/api/markte/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          geskiedenis: nuwe.map((b) => ({ rol: b.rol, teks: b.teks })).slice(-12),
          portefeulje,
        }),
      });
      if (res.status === 503) {
        setAf(true);
        return;
      }
      const data = await res.json();
      setBoodskappe((b) => [
        ...b,
        { rol: "buitelyn", teks: (data.antwoord ?? data.fout ?? "Iets het skeefgeloop.").replace(/\*\*/g, "") },
      ]);
      setTimeout(() => einde.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch {
      setBoodskappe((b) => [...b, { rol: "buitelyn", teks: "Netwerkfout — probeer weer." }]);
    } finally {
      setBesig(false);
    }
  }

  return (
    <aside className="flex max-h-[calc(100vh-8rem)] min-h-[480px] flex-col self-start border-2 border-ink bg-offwhite xl:sticky xl:top-6">
      <h2 className="flex items-center gap-2 border-b-2 border-ink px-4 py-2.5 text-xs font-semibold tracking-[0.16em]">
        VRA BUITELYN
        <span aria-hidden className="size-1.5 rounded-full bg-red" />
        <span className="font-normal normal-case tracking-normal text-ink/50">
          KI-markassistent
        </span>
      </h2>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {af ? (
          <p className="border-2 border-ink/30 bg-paper p-3 text-sm text-ink/60">
            Die assistent is binnekort beskikbaar.
          </p>
        ) : boodskappe.length === 0 ? (
          <>
            <p className="text-sm text-ink/60">
              Vra enigiets oor die markte — ek kyk na dieselfde syfers as jy, en na Buitelyn
              se nuusbriewe.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {VOORSTELLE.map((v) => (
                <button
                  key={v}
                  onClick={() => stuur(v)}
                  className="border-2 border-ink bg-paper px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-ink hover:text-offwhite"
                >
                  {v}
                </button>
              ))}
            </div>
          </>
        ) : (
          boodskappe.map((b, i) => (
            <div
              key={i}
              className={`max-w-[92%] whitespace-pre-wrap border-2 p-3 text-sm leading-relaxed ${
                b.rol === "gebruiker"
                  ? "ml-auto border-ink bg-ink text-offwhite"
                  : "border-ink/25 bg-paper"
              }`}
            >
              {b.rol === "buitelyn" ? linkifiseer(b.teks) : b.teks}
            </div>
          ))
        )}
        {besig ? <p className="text-xs font-semibold text-ink/50">Buitelyn dink…</p> : null}
        <div ref={einde} />
      </div>

      {!af ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            stuur(teks);
          }}
          className="flex gap-2 border-t-2 border-ink p-3"
        >
          <input
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Vra oor die markte…"
            className="min-w-0 flex-1 border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:border-red"
          />
          <button
            disabled={besig}
            className="bg-ink px-4 py-2 text-sm font-semibold text-offwhite hover:bg-ink/85 disabled:opacity-50"
          >
            →
          </button>
        </form>
      ) : null}
    </aside>
  );
}
