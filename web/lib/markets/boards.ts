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

/** Yahoo-simboolvorm: letters/syfers plus die JSE-/indeks-/pare-tekens. */
export function isGeldigeSimbool(simbool: string): boolean {
  return /^[A-Z0-9^][A-Z0-9.^=-]{0,11}$/.test(simbool);
}

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

/* Breër JSE-universum vir die Bewegers-bord — groot/likiede name buite die
   hoofbord. Onopgeloste simbole val stil uit getQuotes se resultaat. */
export const BEWEGERS_SIMBOLE: BordItem[] = [
  ...BORDE[0].items.filter((i) => i.simbool !== "STX40.JO"),
  { simbool: "ABG.JO", naam: "Absa" },
  { simbool: "NED.JO", naam: "Nedbank" },
  { simbool: "INL.JO", naam: "Investec" },
  { simbool: "SLM.JO", naam: "Sanlam" },
  { simbool: "OMU.JO", naam: "Old Mutual" },
  { simbool: "DSY.JO", naam: "Discovery" },
  { simbool: "REM.JO", naam: "Remgro" },
  { simbool: "CFR.JO", naam: "Richemont" },
  { simbool: "ANH.JO", naam: "AB InBev" },
  { simbool: "BTI.JO", naam: "British American Tobacco" },
  { simbool: "GLN.JO", naam: "Glencore" },
  { simbool: "BHG.JO", naam: "BHP" },
  { simbool: "IMP.JO", naam: "Impala Platinum" },
  { simbool: "SSW.JO", naam: "Sibanye-Stillwater" },
  { simbool: "ANG.JO", naam: "AngloGold Ashanti" },
  { simbool: "HAR.JO", naam: "Harmony" },
  { simbool: "EXX.JO", naam: "Exxaro" },
  { simbool: "KIO.JO", naam: "Kumba Yster" },
  { simbool: "SHP.JO", naam: "Shoprite" },
  { simbool: "WHL.JO", naam: "Woolworths" },
  { simbool: "PIK.JO", naam: "Pick n Pay" },
  { simbool: "CLS.JO", naam: "Clicks" },
  { simbool: "SPP.JO", naam: "Spar" },
  { simbool: "TFG.JO", naam: "TFG" },
  { simbool: "TRU.JO", naam: "Truworths" },
  { simbool: "MRP.JO", naam: "Mr Price" },
  { simbool: "BID.JO", naam: "Bid Corp" },
  { simbool: "BVT.JO", naam: "Bidvest" },
  { simbool: "APN.JO", naam: "Aspen" },
  { simbool: "NTC.JO", naam: "Netcare" },
  { simbool: "TKG.JO", naam: "Telkom" },
  { simbool: "OUT.JO", naam: "OUTsurance" },
  { simbool: "NRP.JO", naam: "NEPI Rockcastle" },
  { simbool: "GRT.JO", naam: "Growthpoint" },
  { simbool: "MNP.JO", naam: "Mondi" },
  { simbool: "SAP.JO", naam: "Sappi" },
];

export function bewegersNaam(simbool: string): string {
  return BEWEGERS_SIMBOLE.find((i) => i.simbool === simbool)?.naam ?? naamVirSimbool(simbool);
}
