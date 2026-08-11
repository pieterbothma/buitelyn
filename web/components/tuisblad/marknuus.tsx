import type { NuusItem } from "@/lib/markets/nuus";

/* Marknuus — die derde blok in die markte-kolom.
   Uitleg C se skets het net die oorsig en die bewegers gehad, en op 'n dag
   met vyf skuiwers werk dit. Met die egte data loop die kolom egter dikwels
   droog: die skuiwer-notas word net vir aandele wat ±3% beweeg geskryf, en
   op 'n stil dag is dit twee reëls teenoor 'n regterkolom van vyf stukke.
   Hierdie lys is reeds gekas en reeds vertaal — dit kos niks ekstra nie en
   hou die blad se belofte ("die markte is die voordeur") ook op stil dae. */

const MAKS = 5;

const tydFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  hour: "2-digit",
  minute: "2-digit",
});

export function MarkNuus({ items }: { items: NuusItem[] }) {
  const lys = items.slice(0, MAKS);
  if (lys.length === 0) return null;

  return (
    <section className="border-2 border-ink bg-offwhite p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-bold tracking-[.14em] text-ink/50">MARKNUUS</p>
        <a href="/markte" className="shrink-0 text-[11px] font-semibold underline underline-offset-4">
          Meer
        </a>
      </div>
      <ul className="mt-3">
        {lys.map((n) => (
          <li key={n.skakel} className="border-t border-ink/10 py-3 first:border-t-0 first:pt-0">
            <a
              href={n.skakel}
              target="_blank"
              rel="noopener noreferrer"
              className="group block underline-offset-4"
            >
              <p className="text-[14px] font-semibold leading-snug group-hover:underline">{n.titel}</p>
              <p className="mt-1 text-[11px] tracking-[.08em] text-ink/50">
                {n.bron.toUpperCase()} · {tydFmt.format(new Date(n.gepubliseer))}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
