"use client";

import { useState } from "react";

/* Die groot oproep onderaan die tuisblad.
   Dit skryf na Buitelyn se eie tabel, nie na Substack nie. Die "Nuusbrief"-
   skakels op die werf stuur almal mense na Substack, wat beteken daardie
   adresse behoort aan Substack; hierdie een is die lys wat ons kan vat waar
   ons ook al heen gaan.

   Ink-band eerder as papier: dit is die enigste blok onder die vou wat 'n
   mens se oog moet vang, en kontras doen dit sonder dat 'n kleuraksent
   nodig is. */

type Stand = { tipe: "rus" | "besig" | "klaar" } | { tipe: "fout"; boodskap: string };

export function EposCta() {
  const [epos, setEpos] = useState("");
  const [webwerf, setWebwerf] = useState(""); // heuningpot — sien die API-roete
  const [stand, setStand] = useState<Stand>({ tipe: "rus" });

  async function stuur(e: React.FormEvent) {
    e.preventDefault();
    if (stand.tipe === "besig") return;
    setStand({ tipe: "besig" });
    try {
      const res = await fetch("/api/nuusbrief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ epos, webwerf }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStand({ tipe: "fout", boodskap: data?.fout ?? "Iets het verkeerd geloop." });
        return;
      }
      setStand({ tipe: "klaar" });
      setEpos("");
    } catch {
      setStand({ tipe: "fout", boodskap: "Kon nie deurkom nie — kyk jou verbinding." });
    }
  }

  return (
    <section className="border-t border-ink/15 bg-ink text-offwhite">
      <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-14 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <h2 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] md:text-[42px]">
              Kry Buitelyn elke oggend via e-pos
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-offwhite/70">
              Die markte-oorsig, die dag se grootste bewegers en die redes daaragter — in jou
              inmandjie voordat die beurs oopmaak. Gratis.
            </p>
          </div>

          {stand.tipe === "klaar" ? (
            <p className="text-[17px] font-semibold" role="status">
              Dankie — jy is op die lys.
              <span className="mt-1 block text-[14px] font-normal text-offwhite/60">
                Ons stuur die eerste een die volgende oggend.
              </span>
            </p>
          ) : (
            <form onSubmit={stuur} noValidate>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="epos-cta" className="sr-only">
                  Jou e-posadres
                </label>
                <input
                  id="epos-cta"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jou@epos.co.za"
                  value={epos}
                  onChange={(e) => setEpos(e.target.value)}
                  aria-invalid={stand.tipe === "fout"}
                  className="min-w-0 flex-1 border border-offwhite/30 bg-transparent px-4 py-3.5 text-[15px] placeholder:text-offwhite/40 focus:border-offwhite focus:outline-none"
                />
                {/* Versteek vir mense, sigbaar vir bots. Nie display:none nie —
                    party bots slaan dít oor; hierdie een lyk regtig. */}
                <input
                  type="text"
                  name="webwerf"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  value={webwerf}
                  onChange={(e) => setWebwerf(e.target.value)}
                  className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
                />
                <button
                  type="submit"
                  disabled={stand.tipe === "besig"}
                  className="shrink-0 bg-offwhite px-6 py-3.5 text-[12px] font-bold tracking-[.12em] text-ink transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  {stand.tipe === "besig" ? "STUUR…" : "TEKEN IN"}
                </button>
              </div>
              {stand.tipe === "fout" && (
                <p className="mt-2.5 text-[13px] text-offwhite/80" role="alert">
                  {stand.boodskap}
                </p>
              )}
              <p className="mt-3 text-[12px] leading-snug text-offwhite/50">
                Net die nuusbrief. Geen derde partye nie, en jy kan enige tyd afmeld.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
