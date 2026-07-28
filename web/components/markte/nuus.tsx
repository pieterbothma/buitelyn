import type { NuusItem } from "@/lib/markets/nuus";

const tydFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  hour: "2-digit",
  minute: "2-digit",
});
const datumFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "numeric",
  month: "short",
});

function wanneer(iso: string): string {
  const d = new Date(iso);
  return Date.now() - d.getTime() < 24 * 60 * 60 * 1000 ? tydFmt.format(d) : datumFmt.format(d);
}

export function NuusBord({
  items,
  onVra,
}: {
  items: NuusItem[];
  onVra?: (vraag: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="mb-6 border-2 border-ink bg-offwhite">
      <h2 className="flex items-center gap-2 border-b-2 border-ink px-4 py-2 text-xs font-semibold tracking-[0.16em]">
        NUUS
        <span aria-hidden className="size-1.5 rounded-full bg-red" />
      </h2>
      <ul className="divide-y divide-ink/10">
        {items.map((i) => (
          <li key={i.skakel} className="px-4 py-3">
            <p className="flex items-baseline gap-2 text-[11px] tracking-[0.14em] text-ink/50">
              {i.bron.toUpperCase()}
              <span className="tabular-nums">{wanneer(i.gepubliseer)}</span>
            </p>
            <a
              href={i.skakel}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block text-sm font-bold leading-snug underline-offset-4 hover:underline"
            >
              {i.titel}
            </a>
            {i.opsomming ? (
              <p className="mt-1 text-sm leading-relaxed text-ink/70">{i.opsomming}</p>
            ) : null}
            {onVra && i.vrae?.length ? (
              <p className="mt-1.5 flex flex-wrap gap-2">
                {i.vrae.slice(0, 2).map((v) => (
                  <button
                    key={v}
                    onClick={() => onVra(v)}
                    className="border border-ink/30 bg-paper px-2 py-1 text-xs font-semibold text-ink/70 hover:border-ink hover:bg-ink hover:text-offwhite"
                  >
                    {v}
                  </button>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
