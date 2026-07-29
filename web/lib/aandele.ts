/* Die publieke /aandele-universum: Wave 1 = JSE-grootname + VSA-megacaps.
   Slug = maatskappynaam (wat mense soek: "sasol", nie "sol" nie); die ou
   ticker-slugs leef voort as aliasse wat permanent herlei. */

export type Aandeel = { slug: string; simbool: string; naam: string; land: "za" | "vsa" };

const JSE: [string, string, string][] = [
  ["naspers", "NPN.JO", "Naspers"],
  ["prosus", "PRX.JO", "Prosus"],
  ["capitec", "CPI.JO", "Capitec"],
  ["firstrand", "FSR.JO", "FirstRand"],
  ["standard-bank", "SBK.JO", "Standard Bank"],
  ["absa", "ABG.JO", "Absa"],
  ["nedbank", "NED.JO", "Nedbank"],
  ["investec", "INL.JO", "Investec"],
  ["sanlam", "SLM.JO", "Sanlam"],
  ["old-mutual", "OMU.JO", "Old Mutual"],
  ["discovery", "DSY.JO", "Discovery"],
  ["outsurance", "OUT.JO", "OUTsurance"],
  ["remgro", "REM.JO", "Remgro"],
  ["mtn", "MTN.JO", "MTN"],
  ["vodacom", "VOD.JO", "Vodacom"],
  ["telkom", "TKG.JO", "Telkom"],
  ["sasol", "SOL.JO", "Sasol"],
  ["anglo-american", "AGL.JO", "Anglo American"],
  ["bhp", "BHG.JO", "BHP"],
  ["glencore", "GLN.JO", "Glencore"],
  ["impala-platinum", "IMP.JO", "Impala Platinum"],
  ["sibanye-stillwater", "SSW.JO", "Sibanye-Stillwater"],
  ["anglogold-ashanti", "ANG.JO", "AngloGold Ashanti"],
  ["gold-fields", "GFI.JO", "Gold Fields"],
  ["harmony", "HAR.JO", "Harmony"],
  ["exxaro", "EXX.JO", "Exxaro"],
  ["kumba", "KIO.JO", "Kumba Yster"],
  ["shoprite", "SHP.JO", "Shoprite"],
  ["woolworths", "WHL.JO", "Woolworths"],
  ["clicks", "CLS.JO", "Clicks"],
  ["dis-chem", "DCP.JO", "Dis-Chem"],
  ["spar", "SPP.JO", "Spar"],
  ["tfg", "TFG.JO", "TFG"],
  ["mr-price", "MRP.JO", "Mr Price"],
  ["pick-n-pay", "PIK.JO", "Pick n Pay"],
  ["bid-corp", "BID.JO", "Bid Corp"],
  ["bidvest", "BVT.JO", "Bidvest"],
  ["aspen", "APN.JO", "Aspen"],
  ["netcare", "NTC.JO", "Netcare"],
  ["richemont", "CFR.JO", "Richemont"],
  ["ab-inbev", "ANH.JO", "AB InBev"],
  ["british-american-tobacco", "BTI.JO", "British American Tobacco"],
];

const VSA: [string, string, string][] = [
  ["apple", "AAPL", "Apple"],
  ["microsoft", "MSFT", "Microsoft"],
  ["nvidia", "NVDA", "Nvidia"],
  ["alphabet", "GOOGL", "Alphabet (Google)"],
  ["amazon", "AMZN", "Amazon"],
  ["meta", "META", "Meta (Facebook)"],
  ["tesla", "TSLA", "Tesla"],
  ["netflix", "NFLX", "Netflix"],
  ["broadcom", "AVGO", "Broadcom"],
  ["jpmorgan", "JPM", "JPMorgan Chase"],
];

export const AANDELE: Aandeel[] = [
  ...JSE.map(([slug, simbool, naam]) => ({ slug, simbool, naam, land: "za" as const })),
  ...VSA.map(([slug, simbool, naam]) => ({ slug, simbool, naam, land: "vsa" as const })),
];

export function kryAandeel(slug: string): Aandeel | undefined {
  return AANDELE.find((a) => a.slug === slug.toLowerCase());
}

/** Ou ticker-slug ("sol", "npn") → nuwe naam-slug, vir permanente redirects. */
export function tickerAlias(slug: string): Aandeel | undefined {
  const s = slug.toLowerCase();
  return AANDELE.find((a) => a.simbool.replace(".JO", "").toLowerCase() === s);
}
