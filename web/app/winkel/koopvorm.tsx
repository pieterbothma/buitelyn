"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PROVINSIES, VERSENDING_SENT } from "@/lib/winkel/valideer";
import { rand } from "@/lib/winkel/epos";

/* Ses Yaga-oorspronklike foto's van die Seepunt-pet. Die kleurkieser koppel
   NIE foto per kleur nie — een gedeelde galery per produk (Piet, 2026-09-01):
   die foto's wissel in beligting/hoek, nie in kleur nie, en 'n vals belofte
   ("dié foto is die Kakie-een") is erger as geen belofte nie. af871d eerste
   as die held-foto. */
const FOTOS = ["af871d", "24c6ee", "8bf0de", "e50849", "9398f3", "d9952d"].map(
  (h) => `/winkel/pet-${h}.jpg`
);

type Variant = { id: string; kleur: string; voorraad: number; fotos: unknown };
type Produk = { id: string; naam: string; beskrywing: string; prys_sent: number; winkel_variante: Variant[] };

const AANTALLE = [1, 2, 3, 4, 5] as const;

export function Koopvorm({ produk }: { produk: Produk }) {
  const beskikbaar = produk.winkel_variante.filter((v) => v.voorraad > 0);
  const [variantId, setVariantId] = useState(beskikbaar[0]?.id ?? "");
  const [aantal, setAantal] = useState(1);
  const [naam, setNaam] = useState("");
  const [van, setVan] = useState("");
  const [epos, setEpos] = useState("");
  const [selfoon, setSelfoon] = useState("");
  const [straat, setStraat] = useState("");
  const [woonbuurt, setWoonbuurt] = useState("");
  const [stad, setStad] = useState("");
  const [provinsie, setProvinsie] = useState("");
  const [poskode, setPoskode] = useState("");
  const [nota, setNota] = useState("");
  const [besig, setBesig] = useState(false);
  const [fout, setFout] = useState("");
  const heuningpot = useRef<HTMLInputElement>(null);

  const gekoseVariant = produk.winkel_variante.find((v) => v.id === variantId);
  const itemSent = produk.prys_sent * aantal;
  const totaalSent = itemSent + VERSENDING_SENT;

  async function bestel() {
    if (!gekoseVariant || besig) return;
    setBesig(true);
    setFout("");
    try {
      const res = await fetch("/api/winkel/tjek", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variantId,
          aantal,
          koper: { naam, van, epos, selfoon },
          adres: { straat, woonbuurt, stad, provinsie, poskode, nota },
          webwerf: heuningpot.current?.value ?? "",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url as string);
        return;
      }
      setFout(data.fout ?? "Iets het verkeerd geloop. Probeer weer.");
    } catch {
      setFout("Kon nie met die bediener praat nie. Probeer weer.");
    } finally {
      setBesig(false);
    }
  }

  return (
    <div>
      <div className="border-y-2 border-ink">
        <div className="my-1 border-y border-ink py-3">
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">{produk.naam}</h1>
        </div>
      </div>

      <div className="mt-6">
        <Image
          src={FOTOS[0]}
          alt={produk.naam}
          width={1600}
          height={900}
          className="w-full border-2 border-ink object-cover"
          priority
        />
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {FOTOS.slice(1).map((src) => (
            <Image
              key={src}
              src={src}
              alt={produk.naam}
              width={96}
              height={96}
              className="size-24 shrink-0 border border-ink/20 object-cover"
            />
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-ink/80">{produk.beskrywing}</p>

      <div className="mt-6">
        <p className="text-xs font-semibold tracking-[0.16em]">KLEUR</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {produk.winkel_variante.map((v) => {
            const uitverkoop = v.voorraad === 0;
            const gekies = v.id === variantId;
            return (
              <button
                key={v.id}
                type="button"
                disabled={uitverkoop}
                onClick={() => setVariantId(v.id)}
                className={`border px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                  gekies ? "border-ink bg-ink text-offwhite" : "border-ink/30 text-ink/70 hover:border-ink hover:text-ink"
                }`}
              >
                {v.kleur}
                {uitverkoop ? " — Uitverkoop" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {!gekoseVariant ? (
        <p className="mt-4 text-sm text-red">Al ons kleure is tans uitverkoop. Kom kyk binnekort weer.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            bestel();
          }}
          className="mt-8 space-y-6"
        >
          <input
            ref={heuningpot}
            type="text"
            name="webwerf"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 -translate-x-full opacity-0"
          />

          <div>
            <p className="text-xs font-semibold tracking-[0.16em]">HOEVEELHEID</p>
            <select
              value={aantal}
              onChange={(e) => setAantal(Number(e.target.value))}
              className="mt-2 w-24 border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
            >
              {AANTALLE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.16em]">JOU BESONDERHEDE</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor="naam" className="mb-1 block text-xs text-ink/50">Naam</label>
                <input
                  id="naam"
                  name="naam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  autoComplete="given-name"
                  required
                  className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                />
              </div>
              <div>
                <label htmlFor="van" className="mb-1 block text-xs text-ink/50">Van</label>
                <input
                  id="van"
                  name="van"
                  value={van}
                  onChange={(e) => setVan(e.target.value)}
                  autoComplete="family-name"
                  required
                  className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                />
              </div>
              <div>
                <label htmlFor="epos" className="mb-1 block text-xs text-ink/50">E-pos</label>
                <input
                  id="epos"
                  name="epos"
                  value={epos}
                  onChange={(e) => setEpos(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                />
              </div>
              <div>
                <label htmlFor="selfoon" className="mb-1 block text-xs text-ink/50">Selfoon</label>
                <input
                  id="selfoon"
                  name="selfoon"
                  value={selfoon}
                  onChange={(e) => setSelfoon(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="082 123 4567"
                  required
                  className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.16em]">AFLEWERINGSADRES</p>
            <div className="mt-2 grid gap-2">
              <div>
                <label htmlFor="straat" className="mb-1 block text-xs text-ink/50">Straatadres</label>
                <input
                  id="straat"
                  name="straat"
                  value={straat}
                  onChange={(e) => setStraat(e.target.value)}
                  autoComplete="street-address"
                  required
                  className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="woonbuurt" className="mb-1 block text-xs text-ink/50">Woonbuurt</label>
                  <input
                    id="woonbuurt"
                    name="woonbuurt"
                    value={woonbuurt}
                    onChange={(e) => setWoonbuurt(e.target.value)}
                    required
                    className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                  />
                </div>
                <div>
                  <label htmlFor="stad" className="mb-1 block text-xs text-ink/50">Stad</label>
                  <input
                    id="stad"
                    name="stad"
                    value={stad}
                    onChange={(e) => setStad(e.target.value)}
                    autoComplete="address-level2"
                    required
                    className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="provinsie" className="mb-1 block text-xs text-ink/50">Provinsie</label>
                  <select
                    id="provinsie"
                    name="provinsie"
                    value={provinsie}
                    onChange={(e) => setProvinsie(e.target.value)}
                    autoComplete="address-level1"
                    required
                    className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                  >
                    <option value="">Kies provinsie…</option>
                    {PROVINSIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="poskode" className="mb-1 block text-xs text-ink/50">Poskode</label>
                  <input
                    id="poskode"
                    name="poskode"
                    value={poskode}
                    onChange={(e) => setPoskode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    required
                    className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="nota" className="mb-1 block text-xs text-ink/50">Nota vir die koerier (opsioneel)</label>
                <textarea
                  id="nota"
                  name="nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  autoComplete="off"
                  rows={2}
                  className="w-full border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
                />
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink/50">
            Ons gebruik hierdie besonderhede net om jou bestelling af te lewer — sien ons{" "}
            <Link href="/privaatheid" className="underline underline-offset-4">
              privaatheidsbeleid
            </Link>
            .
          </p>

          <div className="border-t-2 border-ink pt-4">
            <p className="text-sm tabular-nums">
              {rand(itemSent)} + {rand(VERSENDING_SENT)} versending = <strong>{rand(totaalSent)}</strong>
            </p>

            {fout ? <p className="mt-3 text-sm text-red">{fout}</p> : null}

            <button
              type="submit"
              disabled={besig}
              className="mt-4 w-full border-2 border-ink bg-ink px-4 py-3 text-sm font-bold text-offwhite hover:border-red hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
            >
              {besig ? "Skakel na Paystack…" : "Betaal met Paystack"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
