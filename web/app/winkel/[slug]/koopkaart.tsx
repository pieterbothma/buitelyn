"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMandjie } from "@/lib/winkel/mandjie";
import { rand } from "@/lib/winkel/epos";
import type { Produk, Variant } from "./page";

const GROOTTE_VOLGORDE = ["S", "M", "L", "XL", "XXL"];
const AANTALLE = [1, 2, 3, 4, 5] as const;

/** Die eerste kleur/grootte met voorraad — of, as ALLES uitverkoop is,
 *  bloot die eerste in volgorde, sodat die kieser nooit leeg staan nie. */
function eersteBeskikbareKleur(kleure: string[], variante: Variant[]): string {
  return kleure.find((k) => variante.some((v) => v.kleur === k && v.voorraad > 0)) ?? kleure[0] ?? "";
}
function eersteBeskikbareGrootte(grootes: string[], variante: Variant[], kleur: string): string {
  if (grootes.length === 0) return "";
  return (
    grootes.find((g) => variante.some((v) => v.kleur === kleur && v.grootte === g && v.voorraad > 0)) ?? grootes[0]
  );
}

export function Koopkaart({ produk }: { produk: Produk }) {
  const { voegBy } = useMandjie();
  const fotos = Array.isArray(produk.fotos) ? (produk.fotos as string[]) : [];
  const aktieweVariante = useMemo(() => produk.winkel_variante.filter((v) => v.aktief), [produk]);

  const kleure = useMemo(() => Array.from(new Set(aktieweVariante.map((v) => v.kleur))), [aktieweVariante]);
  const grootteBestaan = aktieweVariante.some((v) => v.grootte !== null);
  const grootes = useMemo(
    () => (grootteBestaan ? GROOTTE_VOLGORDE.filter((g) => aktieweVariante.some((v) => v.grootte === g)) : []),
    [aktieweVariante, grootteBestaan],
  );

  const [kleur, setKleur] = useState(() => eersteBeskikbareKleur(kleure, aktieweVariante));
  const [grootte, setGrootte] = useState(() => eersteBeskikbareGrootte(grootes, aktieweVariante, kleur));
  const [aantal, setAantal] = useState(1);
  const [bygevoeg, setBygevoeg] = useState(false);

  function kiesKleur(k: string) {
    setKleur(k);
    setGrootte(eersteBeskikbareGrootte(grootes, aktieweVariante, k));
    setBygevoeg(false);
  }

  const gekoseVariant = aktieweVariante.find(
    (v) => v.kleur === kleur && (grootteBestaan ? v.grootte === grootte : true),
  );
  const uitverkoop = !gekoseVariant || gekoseVariant.voorraad === 0;

  function voegByMandjie() {
    if (!gekoseVariant || uitverkoop) return;
    voegBy(gekoseVariant.id, aantal);
    setBygevoeg(true);
  }

  return (
    <div>
      <div className="border-y-2 border-ink">
        <div className="my-1 border-y border-ink py-3">
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">{produk.naam}</h1>
        </div>
      </div>

      <div className="mt-6">
        {fotos[0] ? (
          <Image
            src={fotos[0]}
            alt={produk.naam}
            width={1600}
            height={900}
            className="w-full border-2 border-ink object-cover"
            priority
          />
        ) : (
          <div className="aspect-video w-full border-2 border-ink bg-offwhite" />
        )}
        {fotos.length > 1 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {fotos.slice(1).map((src) => (
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
        ) : null}
      </div>

      <p className="mt-6 text-sm leading-relaxed text-ink/80">{produk.beskrywing}</p>

      {aktieweVariante.length === 0 ? (
        <p className="mt-6 text-sm text-red">Hierdie produk is tans nie beskikbaar nie.</p>
      ) : (
        <>
          <div className="mt-6">
            <p className="text-xs font-semibold tracking-[0.16em]">KLEUR</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {kleure.map((k) => {
                const kleurUitverkoop = !grootteBestaan && !aktieweVariante.some((v) => v.kleur === k && v.voorraad > 0);
                const gekies = k === kleur;
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={kleurUitverkoop}
                    onClick={() => kiesKleur(k)}
                    className={`border px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                      gekies ? "border-ink bg-ink text-offwhite" : "border-ink/30 text-ink/70 hover:border-ink hover:text-ink"
                    }`}
                  >
                    {k}
                    {kleurUitverkoop ? " — Uitverkoop" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {grootteBestaan ? (
            <div className="mt-6">
              <p className="text-xs font-semibold tracking-[0.16em]">GROOTTE</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {grootes.map((g) => {
                  const combo = aktieweVariante.find((v) => v.kleur === kleur && v.grootte === g);
                  const comboUitverkoop = !combo || combo.voorraad === 0;
                  const gekies = g === grootte;
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={comboUitverkoop}
                      onClick={() => {
                        setGrootte(g);
                        setBygevoeg(false);
                      }}
                      className={`border px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                        gekies ? "border-ink bg-ink text-offwhite" : "border-ink/30 text-ink/70 hover:border-ink hover:text-ink"
                      }`}
                    >
                      {g}
                      {comboUitverkoop ? " — Uitverkoop" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
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

          <div className="mt-8 border-t-2 border-ink pt-4">
            <p className="text-sm tabular-nums">
              <strong>{rand(produk.prys_sent * aantal)}</strong>
            </p>

            {uitverkoop ? (
              <p className="mt-4 text-sm text-red">Hierdie kombinasie is tans uitverkoop.</p>
            ) : (
              <button
                type="button"
                onClick={voegByMandjie}
                className="mt-4 w-full border-2 border-ink bg-ink px-4 py-3 text-sm font-bold text-offwhite hover:border-red hover:bg-red"
              >
                Voeg by mandjie
              </button>
            )}

            {bygevoeg ? (
              <p className="mt-4 text-sm">
                In die mandjie ✓ —{" "}
                <Link href="/winkel/mandjie" className="font-semibold underline underline-offset-4">
                  Gaan na mandjie
                </Link>{" "}
                ·{" "}
                <Link href="/winkel" className="font-semibold underline underline-offset-4">
                  Koop verder
                </Link>
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
