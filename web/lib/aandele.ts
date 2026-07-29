/* Die publieke /aandele-universum: Wave 1 = JSE-grootname + VSA-megacaps
   (EasyEquities-data wys SA-kleinbeleggers hou meer Nvidia as enige JSE-aandeel).
   Slug = kleinletter-kode; die blaaie word vooraf gebou (generateStaticParams). */

export type Aandeel = { slug: string; simbool: string; naam: string; land: "za" | "vsa" };

const JSE: [string, string][] = [
  ["NPN.JO", "Naspers"],
  ["PRX.JO", "Prosus"],
  ["CPI.JO", "Capitec"],
  ["FSR.JO", "FirstRand"],
  ["SBK.JO", "Standard Bank"],
  ["ABG.JO", "Absa"],
  ["NED.JO", "Nedbank"],
  ["INL.JO", "Investec"],
  ["SLM.JO", "Sanlam"],
  ["OMU.JO", "Old Mutual"],
  ["DSY.JO", "Discovery"],
  ["OUT.JO", "OUTsurance"],
  ["REM.JO", "Remgro"],
  ["MTN.JO", "MTN"],
  ["VOD.JO", "Vodacom"],
  ["TKG.JO", "Telkom"],
  ["SOL.JO", "Sasol"],
  ["AGL.JO", "Anglo American"],
  ["BHG.JO", "BHP"],
  ["GLN.JO", "Glencore"],
  ["IMP.JO", "Impala Platinum"],
  ["SSW.JO", "Sibanye-Stillwater"],
  ["ANG.JO", "AngloGold Ashanti"],
  ["GFI.JO", "Gold Fields"],
  ["HAR.JO", "Harmony"],
  ["EXX.JO", "Exxaro"],
  ["KIO.JO", "Kumba Yster"],
  ["SHP.JO", "Shoprite"],
  ["WHL.JO", "Woolworths"],
  ["CLS.JO", "Clicks"],
  ["DCP.JO", "Dis-Chem"],
  ["SPP.JO", "Spar"],
  ["TFG.JO", "TFG"],
  ["MRP.JO", "Mr Price"],
  ["PIK.JO", "Pick n Pay"],
  ["BID.JO", "Bid Corp"],
  ["BVT.JO", "Bidvest"],
  ["APN.JO", "Aspen"],
  ["NTC.JO", "Netcare"],
  ["CFR.JO", "Richemont"],
  ["ANH.JO", "AB InBev"],
  ["BTI.JO", "British American Tobacco"],
];

const VSA: [string, string][] = [
  ["AAPL", "Apple"],
  ["MSFT", "Microsoft"],
  ["NVDA", "Nvidia"],
  ["GOOGL", "Alphabet (Google)"],
  ["AMZN", "Amazon"],
  ["META", "Meta (Facebook)"],
  ["TSLA", "Tesla"],
  ["NFLX", "Netflix"],
  ["AVGO", "Broadcom"],
  ["JPM", "JPMorgan Chase"],
];

export const AANDELE: Aandeel[] = [
  ...JSE.map(([simbool, naam]) => ({
    slug: simbool.replace(".JO", "").toLowerCase(),
    simbool,
    naam,
    land: "za" as const,
  })),
  ...VSA.map(([simbool, naam]) => ({
    slug: simbool.toLowerCase(),
    simbool,
    naam,
    land: "vsa" as const,
  })),
];

export function kryAandeel(slug: string): Aandeel | undefined {
  return AANDELE.find((a) => a.slug === slug.toLowerCase());
}
