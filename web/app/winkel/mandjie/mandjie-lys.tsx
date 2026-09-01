"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMandjie } from "@/lib/winkel/mandjie";
import { useMandjieResolusie, mandjieOpsomming } from "@/lib/winkel/mandjie-resolusie";
import { VERSENDING_SENT } from "@/lib/winkel/valideer";
import { rand } from "@/lib/winkel/epos";

const AANTALLE = [1, 2, 3, 4, 5] as const;

export function MandjieLys() {
  const { items, gelaai: mandjieGelaai, stelAantal, verwyder } = useMandjie();
  const ids = items.map((it) => it.variantId);
  const { variante, gelaai: resolusieGelaai, fout } = useMandjieResolusie(ids, mandjieGelaai);
  const gelaai = mandjieGelaai && resolusieGelaai;
  const { lyne, itemSent, alleBeskikbaar } = mandjieOpsomming(items, variante);
  const totaalSent = itemSent + VERSENDING_SENT;

  /* 'n Lyn se voorraad kan intussen minder as die gestoorde aantal geword
     het (iemand anders het gekoop) — klem die mandjie dadelik daarop af
     sodat die "Gaan betaal"-totaal nooit meer belowe as wat werklik
     beskikbaar is nie. */
  useEffect(() => {
    if (!gelaai) return;
    for (const it of items) {
      const v = variante[it.variantId];
      if (v && v.aktief && v.winkel_produkte?.aktief && v.voorraad > 0 && v.voorraad < it.aantal) {
        stelAantal(it.variantId, v.voorraad);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, variante, gelaai]);

  if (!gelaai) {
    return <p className="text-sm text-ink/60">Laai…</p>;
  }

  if (fout) {
    return (
      <div>
        <p className="text-sm text-red">Kon nie die mandjie laai nie — probeer weer.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-sm font-semibold underline underline-offset-4"
        >
          Herlaai die bladsy
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <p className="text-sm text-ink/70">Jou mandjie is leeg.</p>
        <Link href="/winkel" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
          Gaan wins toe
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-ink/15 border-y-2 border-ink">
        {lyne.map((l) => {
          if (l.status === "onbeskikbaar") {
            return (
              <li key={l.variantId} className="flex items-center justify-between gap-4 py-4">
                <p className="text-sm text-ink/60">Nie meer beskikbaar nie</p>
                <button
                  type="button"
                  onClick={() => verwyder(l.variantId)}
                  className="text-sm underline underline-offset-4"
                >
                  Verwyder
                </button>
              </li>
            );
          }
          if (l.status === "uitverkoop") {
            return (
              <li key={l.variantId} className="flex items-center gap-4 py-4">
                {l.foto ? (
                  <Image
                    src={l.foto}
                    alt={l.naam!}
                    width={80}
                    height={80}
                    className="size-20 shrink-0 border border-ink/20 object-cover opacity-50"
                  />
                ) : (
                  <div className="size-20 shrink-0 bg-offwhite" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{l.naam}</p>
                  <p className="text-sm text-ink/60">
                    {l.kleur}
                    {l.grootte ? `, ${l.grootte}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-red">Uitverkoop</p>
                </div>
                <button
                  type="button"
                  onClick={() => verwyder(l.variantId)}
                  className="text-sm underline underline-offset-4"
                >
                  Verwyder
                </button>
              </li>
            );
          }
          return (
            <li key={l.variantId} className="flex items-center gap-4 py-4">
              {l.foto ? (
                <Image
                  src={l.foto}
                  alt={l.naam!}
                  width={80}
                  height={80}
                  className="size-20 shrink-0 border border-ink/20 object-cover"
                />
              ) : (
                <div className="size-20 shrink-0 bg-offwhite" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.naam}</p>
                <p className="text-sm text-ink/60">
                  {l.kleur}
                  {l.grootte ? `, ${l.grootte}` : ""}
                </p>
                <p className="text-sm tabular-nums">{rand(l.prysSent!)}</p>
                {l.kortVoorraad ? <p className="mt-1 text-xs text-red">Nog net {l.voorraad} oor</p> : null}
              </div>
              <select
                value={l.aantal}
                onChange={(e) => stelAantal(l.variantId, Number(e.target.value))}
                className="border-2 border-ink bg-paper px-2 py-1.5 text-sm outline-none focus:border-red"
              >
                {AANTALLE.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => verwyder(l.variantId)}
                className="text-sm underline underline-offset-4"
              >
                Verwyder
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-1 text-sm tabular-nums">
        <p>Items — {rand(itemSent)}</p>
        <p>Versending — {rand(VERSENDING_SENT)}</p>
        <p className="font-bold">Totaal — {rand(totaalSent)}</p>
      </div>

      {alleBeskikbaar ? (
        <Link
          href="/winkel/betaal"
          className="mt-6 block w-full border-2 border-ink bg-ink px-4 py-3 text-center text-sm font-bold text-offwhite hover:border-red hover:bg-red"
        >
          Gaan betaal
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-6 block w-full cursor-not-allowed border-2 border-ink bg-paper px-4 py-3 text-center text-sm font-bold text-ink/40"
        >
          Gaan betaal
        </button>
      )}
    </>
  );
}
