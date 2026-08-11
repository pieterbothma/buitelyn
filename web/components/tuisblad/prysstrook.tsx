import type { Kwotasie } from "@/lib/markets/source";
import { formatteerPrys } from "@/components/markte/format";

/* Die strook bo-aan die tuisblad. Dis die eerste ding op die bladsy en die
   enigste plek waar die tuisblad kleur gebruik: rooi en groen dra hier
   BETEKENIS (rigting), hulle versier nie. Alles anders bly ink op papier. */

const KORT: Record<string, string> = {
  "STX40.JO": "TOP 40",
  "ZAR=X": "RAND",
  "BZ=F": "BRENT",
  "GC=F": "GOUD",
  "^GSPC": "S&P 500",
  "BTC-ZAR": "BITCOIN",
};

export const STROOK_SIMBOLE = Object.keys(KORT);

export function PrysStrook({ kwotasies }: { kwotasies: Kwotasie[] }) {
  const items = STROOK_SIMBOLE.map((s) => kwotasies.find((k) => k.simbool === s)).filter(
    (k): k is Kwotasie => Boolean(k)
  );
  if (items.length === 0) return null;

  return (
    <div className="border-b border-ink/15 bg-ink text-offwhite">
      {/* Op 'n foon pas ses items nie; laat dit sywaarts rol eerder as om
          items weg te steek — 'n halwe prys is erger as 'n rolstaaf. */}
      <div className="mx-auto flex max-w-[1440px] gap-6 overflow-x-auto px-6 py-2 md:px-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((k) => {
          const d = k.deltaPersent;
          return (
            <div key={k.simbool} className="flex shrink-0 items-baseline gap-2 whitespace-nowrap text-[12px]">
              <span className="font-bold tracking-[.08em]">{KORT[k.simbool]}</span>
              <span className="tabular-nums opacity-90">{formatteerPrys(k)}</span>
              {d != null && (
                <span
                  className="tabular-nums font-semibold"
                  style={{ color: d >= 0 ? "#5ED694" : "#FF8A7A" }}
                >
                  {d >= 0 ? "+" : "−"}
                  {Math.abs(d).toFixed(2).replace(".", ",")}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
