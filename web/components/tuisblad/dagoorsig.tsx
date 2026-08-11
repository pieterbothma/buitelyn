import type { Kwotasie } from "@/lib/markets/source";
import type { Oorsig } from "@/lib/markte-kas";
import { naamVirSimbool } from "@/lib/markets/boards";

/* "Vandag op die markte" — die rede om daagliks terug te kom.
   Die teks, die tyd en die oudio kom alles van die cron af; niks hiervan is
   gegateer nie. Die hittekaart gee die dag se vorm in een oogopslag voordat
   'n mens 'n woord lees. */

const HITTE = ["NPN.JO", "PRX.JO", "CPI.JO", "FSR.JO", "SOL.JO", "MTN.JO", "AGL.JO", "GFI.JO"];

export const HITTE_SIMBOLE = HITTE;

/* Versadiging dra die grootte van die skuif. Onder 0,25% is 'n aandeel
   effektief plat — dan 'n neutrale grys, want 'n bleek groen blokkie vir
   +0,04% lieg oor hoe betekenisvol die dag was. */
const VOL = 3; // 3% en op = vol kleur

function versadiging(delta: number | null): number {
  if (delta == null || Math.abs(delta) < 0.25) return 0;
  return 25 + Math.min(Math.abs(delta) / VOL, 1) * 75;
}

function blokKleur(delta: number | null): string {
  const v = versadiging(delta);
  if (v === 0) return "color-mix(in srgb, var(--ink) 12%, transparent)";
  const basis = delta! >= 0 ? "var(--brand-green)" : "var(--brand-red)";
  return `color-mix(in srgb, ${basis} ${Math.round(v)}%, var(--offwhite))`;
}

/* Die teks moet die blokkie volg. Ink op 'n vol rooi blokkie is amper
   onleesbaar, en 'n hittekaart wie se etikette 'n mens moet raai is net
   dekorasie. Bo halfpad versadig draai die teks om na papierkleur. */
function blokTeks(delta: number | null): string {
  return versadiging(delta) >= 55 ? "var(--offwhite)" : "var(--ink)";
}

export function Dagoorsig({ oorsig, kwotasies }: { oorsig: Oorsig | null; kwotasies: Kwotasie[] }) {
  const blokke = HITTE.map((s) => kwotasies.find((k) => k.simbool === s)).filter(
    (k): k is Kwotasie => Boolean(k)
  );

  return (
    <section className="border-2 border-ink bg-offwhite p-5 md:p-6">
      <p className="text-[11px] font-bold tracking-[.14em] text-ink/50">
        VANDAG OP DIE MARKTE
        {oorsig?.bygewerk && <> · BYGEWERK {oorsig.bygewerk}</>}
      </p>

      {oorsig?.teks ? (
        <p className="mt-3 text-[15px] leading-relaxed md:text-base">{oorsig.teks}</p>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
          Die oorsig word elke oggend, middag en aand geskryf — dit laai net nou nie.{" "}
          <a href="/markte" className="font-semibold underline underline-offset-4">
            Gaan na Markte
          </a>
        </p>
      )}

      {blokke.length > 0 && (
        <div className="mt-5 flex gap-1">
          {blokke.map((k) => (
            <div
              key={k.simbool}
              title={`${naamVirSimbool(k.simbool)} ${k.deltaPersent?.toFixed(2) ?? "—"}%`}
              className="flex h-11 flex-1 flex-col items-center justify-center border border-ink/10"
              style={{ background: blokKleur(k.deltaPersent), color: blokTeks(k.deltaPersent) }}
            >
              <span className="text-[10px] font-bold leading-none tracking-[.06em]">
                {k.simbool.replace(".JO", "")}
              </span>
              <span className="mt-0.5 text-[9px] leading-none tabular-nums opacity-90">
                {k.deltaPersent == null
                  ? "—"
                  : `${k.deltaPersent >= 0 ? "+" : "−"}${Math.abs(k.deltaPersent).toFixed(1).replace(".", ",")}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      {oorsig?.oudioUrl && (
        <a
          href={oorsig.oudioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center gap-3 border border-ink px-4 py-3 transition-colors hover:bg-ink hover:text-offwhite"
        >
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center bg-ink text-[10px] text-offwhite"
          >
            ▶
          </span>
          <span className="text-[11px] font-bold tracking-[.12em]">{oorsig.oudioEtiket}</span>
          {oorsig.oudioDatum && (
            <span className="ml-auto text-[11px] opacity-60">{oorsig.oudioDatum}</span>
          )}
        </a>
      )}
    </section>
  );
}
