export type BordItem = { simbool: string; naam: string };
export type Bord = { titel: string; items: BordItem[] };

/* Simbole verified against Yahoo v8 2026-07-25 (STX40.JO = Satrix Top 40 ETF
   as Top-40 proxy; ^J200 and BTC-ZAR do NOT resolve on Yahoo). */
export const BORDE: Bord[] = [
  {
    titel: "JSE",
    items: [
      { simbool: "STX40.JO", naam: "Top 40 (Satrix)" },
      { simbool: "NPN.JO", naam: "Naspers" },
      { simbool: "PRX.JO", naam: "Prosus" },
      { simbool: "CPI.JO", naam: "Capitec" },
      { simbool: "FSR.JO", naam: "FirstRand" },
      { simbool: "SBK.JO", naam: "Standard Bank" },
      { simbool: "MTN.JO", naam: "MTN" },
      { simbool: "VOD.JO", naam: "Vodacom" },
      { simbool: "SOL.JO", naam: "Sasol" },
      { simbool: "AGL.JO", naam: "Anglo American" },
      { simbool: "GFI.JO", naam: "Gold Fields" },
    ],
  },
  {
    titel: "Wisselkoerse",
    items: [
      { simbool: "ZAR=X", naam: "USD/ZAR" },
      { simbool: "EURZAR=X", naam: "EUR/ZAR" },
      { simbool: "GBPZAR=X", naam: "GBP/ZAR" },
    ],
  },
  {
    titel: "Kommoditeite",
    items: [
      { simbool: "GC=F", naam: "Goud ($/oz)" },
      { simbool: "PL=F", naam: "Platinum ($/oz)" },
      { simbool: "BZ=F", naam: "Brent ($/vat)" },
    ],
  },
  {
    titel: "Kripto",
    items: [
      { simbool: "BTC-ZAR", naam: "Bitcoin (R)" },
      { simbool: "ETH-ZAR", naam: "Ethereum (R)" },
    ],
  },
  {
    titel: "Wêreld",
    items: [
      { simbool: "^GSPC", naam: "S&P 500" },
      { simbool: "^IXIC", naam: "Nasdaq" },
      { simbool: "^FTSE", naam: "FTSE 100" },
      { simbool: "^N225", naam: "Nikkei 225" },
    ],
  },
];

export const ALLE_SIMBOLE = BORDE.flatMap((b) => b.items.map((i) => i.simbool));

export function naamVirSimbool(simbool: string): string {
  for (const b of BORDE) {
    const i = b.items.find((x) => x.simbool === simbool);
    if (i) return i.naam;
  }
  return simbool;
}

/** JSE-handelsure: Ma–Vr 09:00–17:00 SAST. */
export function jseIsOop(nou = new Date()): boolean {
  const sast = new Date(nou.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  const dag = sast.getDay(); // 0=So
  const uur = sast.getHours();
  return dag >= 1 && dag <= 5 && uur >= 9 && uur < 17;
}
