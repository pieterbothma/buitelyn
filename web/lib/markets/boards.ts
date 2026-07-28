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

/* Uitgebreide JSE-universum (~Top 100 likiede name) — voer die Bewegers-bord
   én die "Sien meer"-popup. Onopgeloste/gedelisteerde simbole val stil uit
   getQuotes se resultaat, so die lys mag ruim wees. */
export const JSE_UITGEBREID: BordItem[] = [
  ...BORDE[0].items.filter((i) => i.simbool !== "STX40.JO"),
  // Banke & finansies
  { simbool: "ABG.JO", naam: "Absa" },
  { simbool: "NED.JO", naam: "Nedbank" },
  { simbool: "INL.JO", naam: "Investec Ltd" },
  { simbool: "INP.JO", naam: "Investec plc" },
  { simbool: "SLM.JO", naam: "Sanlam" },
  { simbool: "OMU.JO", naam: "Old Mutual" },
  { simbool: "DSY.JO", naam: "Discovery" },
  { simbool: "MTM.JO", naam: "Momentum" },
  { simbool: "SNT.JO", naam: "Santam" },
  { simbool: "OUT.JO", naam: "OUTsurance" },
  { simbool: "CML.JO", naam: "Coronation" },
  { simbool: "N91.JO", naam: "Ninety One" },
  { simbool: "QLT.JO", naam: "Quilter" },
  { simbool: "KST.JO", naam: "PSG Konsult" },
  { simbool: "TCP.JO", naam: "Transaction Capital" },
  { simbool: "PPE.JO", naam: "Purple Group" },
  { simbool: "REM.JO", naam: "Remgro" },
  { simbool: "RNI.JO", naam: "Reinet" },
  { simbool: "HCI.JO", naam: "HCI" },
  // Hulpbronne & mynbou
  { simbool: "GLN.JO", naam: "Glencore" },
  { simbool: "BHG.JO", naam: "BHP" },
  { simbool: "S32.JO", naam: "South32" },
  { simbool: "VAL.JO", naam: "Valterra Platinum" },
  { simbool: "AMS.JO", naam: "Anglo American Platinum" },
  { simbool: "IMP.JO", naam: "Impala Platinum" },
  { simbool: "NPH.JO", naam: "Northam Platinum" },
  { simbool: "SSW.JO", naam: "Sibanye-Stillwater" },
  { simbool: "ANG.JO", naam: "AngloGold Ashanti" },
  { simbool: "HAR.JO", naam: "Harmony" },
  { simbool: "DRD.JO", naam: "DRDGold" },
  { simbool: "PAN.JO", naam: "Pan African Resources" },
  { simbool: "EXX.JO", naam: "Exxaro" },
  { simbool: "TGA.JO", naam: "Thungela" },
  { simbool: "KIO.JO", naam: "Kumba Yster" },
  { simbool: "ARI.JO", naam: "African Rainbow Minerals" },
  { simbool: "SAP.JO", naam: "Sappi" },
  { simbool: "MNP.JO", naam: "Mondi" },
  { simbool: "OMN.JO", naam: "Omnia" },
  { simbool: "AFE.JO", naam: "AECI" },
  { simbool: "MKR.JO", naam: "Montauk" },
  // Kleinhandel & verbruikers
  { simbool: "SHP.JO", naam: "Shoprite" },
  { simbool: "WHL.JO", naam: "Woolworths" },
  { simbool: "PIK.JO", naam: "Pick n Pay" },
  { simbool: "CLS.JO", naam: "Clicks" },
  { simbool: "DCP.JO", naam: "Dis-Chem" },
  { simbool: "SPP.JO", naam: "Spar" },
  { simbool: "TFG.JO", naam: "TFG" },
  { simbool: "TRU.JO", naam: "Truworths" },
  { simbool: "MRP.JO", naam: "Mr Price" },
  { simbool: "PPH.JO", naam: "Pepkor" },
  { simbool: "LEW.JO", naam: "Lewis" },
  { simbool: "CSB.JO", naam: "Cashbuild" },
  { simbool: "ITE.JO", naam: "Italtile" },
  { simbool: "AVI.JO", naam: "AVI" },
  { simbool: "TBS.JO", naam: "Tiger Brands" },
  { simbool: "RCL.JO", naam: "RCL Foods" },
  { simbool: "OCE.JO", naam: "Oceana" },
  { simbool: "FBR.JO", naam: "Famous Brands" },
  { simbool: "SUR.JO", naam: "Spur" },
  { simbool: "BTI.JO", naam: "British American Tobacco" },
  { simbool: "ANH.JO", naam: "AB InBev" },
  { simbool: "CFR.JO", naam: "Richemont" },
  // Industrieel & dienste
  { simbool: "BID.JO", naam: "Bid Corp" },
  { simbool: "BVT.JO", naam: "Bidvest" },
  { simbool: "APN.JO", naam: "Aspen" },
  { simbool: "NTC.JO", naam: "Netcare" },
  { simbool: "LHC.JO", naam: "Life Healthcare" },
  { simbool: "AIP.JO", naam: "Adcock Ingram" },
  { simbool: "ADH.JO", naam: "ADvTECH" },
  { simbool: "BAW.JO", naam: "Barloworld" },
  { simbool: "WBO.JO", naam: "Wilson Bayly" },
  { simbool: "PPC.JO", naam: "PPC" },
  { simbool: "KAP.JO", naam: "KAP" },
  { simbool: "RLO.JO", naam: "Reunert" },
  { simbool: "MTH.JO", naam: "Motus" },
  { simbool: "CMH.JO", naam: "Combined Motor" },
  { simbool: "SUI.JO", naam: "Sun International" },
  { simbool: "TSG.JO", naam: "Tsogo Sun" },
  { simbool: "CLH.JO", naam: "City Lodge" },
  // Telekoms & tegnologie
  { simbool: "TKG.JO", naam: "Telkom" },
  { simbool: "DTC.JO", naam: "Datatec" },
  { simbool: "BYI.JO", naam: "Bytes" },
  { simbool: "KRO.JO", naam: "Karooooo" },
  { simbool: "BLU.JO", naam: "Blue Label" },
  { simbool: "EOH.JO", naam: "EOH" },
  // Eiendom
  { simbool: "NRP.JO", naam: "NEPI Rockcastle" },
  { simbool: "GRT.JO", naam: "Growthpoint" },
  { simbool: "RDF.JO", naam: "Redefine" },
  { simbool: "RES.JO", naam: "Resilient" },
  { simbool: "FFB.JO", naam: "Fortress B" },
  { simbool: "VKE.JO", naam: "Vukile" },
  { simbool: "HYP.JO", naam: "Hyprop" },
  { simbool: "ATT.JO", naam: "Attacq" },
  { simbool: "EQU.JO", naam: "Equites" },
  { simbool: "SSS.JO", naam: "Stor-Age" },
  { simbool: "LTE.JO", naam: "Lighthouse" },
  { simbool: "SRE.JO", naam: "Sirius" },
];

/* Die Bewegers-bord gebruik dieselfde universum. */
export const BEWEGERS_SIMBOLE: BordItem[] = JSE_UITGEBREID;

export function bewegersNaam(simbool: string): string {
  return JSE_UITGEBREID.find((i) => i.simbool === simbool)?.naam ?? naamVirSimbool(simbool);
}
