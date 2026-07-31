import { SPONSORS, klikUrl, type Plek } from "@/lib/sponsor";
import type { Gids } from "@/lib/gidse";

/* Die enigste plek waar 'n borg op 'n gids kan verskyn. Die reël leef hier in
   kode, nie in 'n prompt nie — 'n hergenereerde gids kan dit nie omseil nie. */
export function magVermeld(gids: Gids, konteks: string | null): boolean {
  return gids.sponsor && Boolean(konteks?.trim());
}

export function SponsorVermelding({
  gids,
  konteks,
  plek,
}: {
  gids: Gids;
  konteks: string | null;
  plek: Plek;
}) {
  if (!magVermeld(gids, konteks)) return null;
  const s = SPONSORS.easyequities;
  return (
    <aside className="my-8 border-l-2 border-red bg-offwhite px-5 py-4">
      <p className="text-[15px] leading-relaxed">
        {konteks}{" "}
        <a
          href={klikUrl("easyequities", gids.slug, plek)}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="font-semibold underline underline-offset-4 hover:text-red"
        >
          {s.naam} besoek &rarr;
        </a>
      </p>
      <p className="mt-2 text-xs text-ink/50">
        {s.naam} borg Buitelyn se YouTube-program. Buitelyn verdien niks aan hierdie
        skakel nie.
      </p>
    </aside>
  );
}
