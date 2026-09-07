"use client";

import type { Veld } from "@/lib/kaart/register";
import type { BeeldBron } from "@/lib/kaart/spec";
import { BeeldKieser } from "@/components/kaart/beeld-kieser";

/* Een invoerkomponent per veldsoort. Die redigeerder wys nooit 'n handgeboude
   paneel per styl nie — dit loop deur STYLE[styl].velde. 'n Nuwe styl kos dus
   een inskrywing in die register, nie 'n nuwe vorm nie.

   Elke veld se `sleutel` is 'n PLAT sleutel op die spec-objek, so die opdater
   bly `{ ...spec, [sleutel]: waarde }`. */

const ETIKET = "text-xs font-semibold";
const INVOER =
  "mt-1 h-11 w-full border-2 border-ink bg-paper px-3 text-sm outline-none focus:border-red";

export function VeldInvoer({
  veld,
  waarde,
  datum,
  gleuf,
  stel,
}: {
  veld: Veld;
  waarde: unknown;
  datum: string;
  gleuf: { w: number; h: number; rond: boolean };
  stel: (nuut: unknown) => void;
}) {
  if (veld.soort === "teks") {
    return (
      <label className={ETIKET}>
        {veld.etiket}
        <input
          value={typeof waarde === "string" ? waarde : ""}
          maxLength={veld.maks}
          placeholder={veld.plekhouer}
          onChange={(e) => stel(e.target.value)}
          className={INVOER}
        />
      </label>
    );
  }

  if (veld.soort === "langteks") {
    const teks = typeof waarde === "string" ? waarde : "";
    return (
      <label className={ETIKET}>
        {veld.etiket}
        {veld.maks ? (
          <span className="ml-2 font-normal text-ink/40">
            {teks.length}/{veld.maks}
          </span>
        ) : null}
        <textarea
          value={teks}
          maxLength={veld.maks}
          rows={3}
          onChange={(e) => stel(e.target.value)}
          className="mt-1 w-full border-2 border-ink bg-paper p-3 text-sm outline-none focus:border-red"
        />
      </label>
    );
  }

  if (veld.soort === "keuse") {
    return (
      <div className={ETIKET}>
        {veld.etiket}
        <div className="mt-1 flex w-fit border-2 border-ink">
          {veld.opsies.map((o) => (
            <button
              key={o.waarde}
              type="button"
              onClick={() => stel(o.waarde)}
              className={`px-3 py-1.5 text-xs font-semibold ${
                waarde === o.waarde ? "bg-ink text-offwhite" : "bg-offwhite hover:bg-paper"
              }`}
            >
              {o.naam}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (veld.soort === "skakelaar") {
    return (
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={waarde !== false}
          onChange={(e) => stel(e.target.checked)}
          className="size-4 accent-[#1A1A1A]"
        />
        {veld.etiket}
      </label>
    );
  }

  if (veld.soort === "lys") {
    const items = Array.isArray(waarde) ? (waarde as string[]) : [];
    const wys = items.length ? items : [""];
    return (
      <div className={ETIKET}>
        {veld.etiket}
        <div className="mt-1 flex flex-col gap-2">
          {wys.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="flex h-11 w-7 items-center justify-center border-2 border-ink bg-offwhite text-xs">
                {i + 1}
              </span>
              <input
                value={item}
                maxLength={140}
                onChange={(e) => {
                  const nuut = [...wys];
                  nuut[i] = e.target.value;
                  stel(nuut);
                }}
                className="h-11 flex-1 border-2 border-ink bg-paper px-3 text-sm outline-none focus:border-red"
              />
              <button
                type="button"
                onClick={() => stel(wys.filter((_, j) => j !== i))}
                title="Verwyder"
                className="h-11 w-9 border-2 border-ink bg-offwhite text-xs font-semibold hover:bg-paper"
              >
                ✕
              </button>
            </div>
          ))}
          {wys.length < veld.maksItems ? (
            <button
              type="button"
              onClick={() => stel([...wys, ""])}
              className="h-9 w-fit border-2 border-ink bg-offwhite px-3 text-xs font-semibold hover:bg-paper"
            >
              + Punt
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // veld.soort === "beeld"
  return (
    <BeeldKieser
      etiket={veld.etiket}
      bron={(waarde as BeeldBron | null) ?? null}
      datum={datum}
      gleuf={gleuf}
      stel={(nuut) => stel(nuut)}
    />
  );
}
