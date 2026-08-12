import type { Skuiwer } from "@/lib/markte-kas";
import { bewegersNaam } from "@/lib/markets/boards";

/* Die kort bewegers-blok. Die volle bord woon op /markte; hier tel net die
   punt daarvan — WAT het beweeg en HOEKOM. Die "hoekom" is die skuiwer-nota
   wat die cron skryf, en dis die enigste rede om hierdie blok te hê: 'n ry
   persentasies sonder redes is 'n tabel, nie joernalistiek nie. */

const MAKS = 5;

const datumFmt = new Intl.DateTimeFormat("af-ZA", { day: "numeric", month: "long" });

function Ry({ s }: { s: Skuiwer }) {
  const op = s.delta >= 0;
  return (
    <li className="flex gap-3 border-t border-ink/10 py-3 first:border-t-0 first:pt-0">
      <span className="w-12 shrink-0 text-[13px] font-bold" title={bewegersNaam(s.simbool)}>
        {s.simbool.replace(".JO", "")}
      </span>
      <span
        className="w-16 shrink-0 text-[13px] font-semibold tabular-nums"
        style={{ color: op ? "var(--brand-green)" : "var(--brand-red)" }}
      >
        {op ? "+" : "−"}
        {Math.abs(s.delta).toFixed(1).replace(".", ",")}%
      </span>
      <span className="min-w-0 text-[13px] leading-snug text-ink/75">{s.nota}</span>
    </li>
  );
}

export function BewegersKort({ skuiwers }: { skuiwers: Skuiwer[] }) {
  if (skuiwers.length === 0) return null;
  const lys = skuiwers.slice(0, MAKS);

  return (
    <section className="border-2 border-ink bg-offwhite p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-bold tracking-[.14em] text-ink/50">
          GROOTSTE BEWEGERS · {datumFmt.format(new Date(`${lys[0].datum}T12:00:00Z`)).toUpperCase()}
        </p>
        <a href="/markte" className="shrink-0 text-[11px] font-semibold underline underline-offset-4">
          Sien almal
        </a>
      </div>
      <ul className="mt-3">
        {lys.map((s) => (
          <Ry key={s.simbool} s={s} />
        ))}
      </ul>
    </section>
  );
}
