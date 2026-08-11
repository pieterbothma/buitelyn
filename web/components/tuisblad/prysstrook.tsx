import type { Kwotasie } from "@/lib/markets/source";
import { formatteerPrys } from "@/components/markte/format";
import { ALLE_SIMBOLE, naamVirSimbool } from "@/lib/markets/boards";

/* Die bandstrook bo-aan die tuisblad.
   Dit was 'n stil ry van ses; nou loop die hele bord verby soos 'n regte
   bandstrook. Dis dieselfde 23 simbole wat die blad in elk geval reeds trek,
   dus kos die langer lys niks ekstra stroomop nie.

   Dis ook die enigste plek op die tuisblad waar kleur gebruik word: rooi en
   groen dra hier BETEKENIS (rigting), hulle versier nie. Alles anders bly
   ink op papier.

   Die beweging kom van dieselfde @keyframes as die koppe-strook, net
   stadiger — sien .animate-ticker-prys in globals.css, wat ook op hover
   stop en heeltemal stilstaan onder prefers-reduced-motion. */

/* Kort etikette: die borde se name is vir 'n tabel geskryf ("Top 40
   (Satrix)", "Goud ($/oz)") en is te lank vir 'n band wat verbygly. */
const KORT: Record<string, string> = {
  "STX40.JO": "TOP 40",
  "NPN.JO": "NASPERS",
  "PRX.JO": "PROSUS",
  "CPI.JO": "CAPITEC",
  "FSR.JO": "FIRSTRAND",
  "SBK.JO": "STD BANK",
  "MTN.JO": "MTN",
  "VOD.JO": "VODACOM",
  "SOL.JO": "SASOL",
  "AGL.JO": "ANGLO",
  "GFI.JO": "GOLD FIELDS",
  "ZAR=X": "RAND/$",
  "EURZAR=X": "RAND/€",
  "GBPZAR=X": "RAND/£",
  "GC=F": "GOUD",
  "PL=F": "PLATINUM",
  "BZ=F": "BRENT",
  "BTC-ZAR": "BITCOIN",
  "ETH-ZAR": "ETHEREUM",
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^FTSE": "FTSE 100",
  "^N225": "NIKKEI",
};

const etiket = (s: string) => KORT[s] ?? naamVirSimbool(s).toUpperCase();

function Item({ k }: { k: Kwotasie }) {
  const d = k.deltaPersent;
  return (
    <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap text-[12px]">
      <span className="font-bold tracking-[.08em]">{etiket(k.simbool)}</span>
      <span className="tabular-nums opacity-90">{formatteerPrys(k)}</span>
      {d != null && (
        <span className="font-semibold tabular-nums" style={{ color: d >= 0 ? "#5ED694" : "#FF8A7A" }}>
          {d >= 0 ? "+" : "−"}
          {Math.abs(d).toFixed(2).replace(".", ",")}%
        </span>
      )}
    </span>
  );
}

export function PrysStrook({ kwotasies }: { kwotasies: Kwotasie[] }) {
  // Bordvolgorde, nie die kwotasie-volgorde nie, sodat die band elke keer
  // dieselfde pad loop: JSE, dan wisselkoerse, kommoditeite, kripto, wêreld.
  const items = ALLE_SIMBOLE.map((s) => kwotasies.find((k) => k.simbool === s)).filter(
    (k): k is Kwotasie => Boolean(k)
  );
  if (items.length === 0) return null;

  return (
    <div className="prys-strook overflow-hidden border-b border-ink/15 bg-ink py-2 text-offwhite">
      {/* Twee identiese helftes: die animasie skuif −50%, dus loop die tweede
          helfte presies in waar die eerste een uitgaan en die naat is nooit
          sigbaar nie. Die kopie is aria-hidden — 'n leser hoef nie elke prys
          twee keer te hoor nie. */}
      <div className="animate-ticker-prys flex w-max gap-8 pl-8">
        <div className="flex gap-8">
          {items.map((k) => (
            <Item key={k.simbool} k={k} />
          ))}
        </div>
        <div className="flex gap-8" aria-hidden>
          {items.map((k) => (
            <Item key={`${k.simbool}-kopie`} k={k} />
          ))}
        </div>
      </div>
    </div>
  );
}
