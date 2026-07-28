/** Parseer die konsep-markdown in kaart-klare stukke: die titel+teaser as
 *  voorbladkaart, en elke ## storie met sy kursiewe byskrif. */
export type KaartStuk = { kop: string; byskrif: string };

export function parseerKonsepStories(teks: string): KaartStuk[] {
  const stukke: KaartStuk[] = [];
  const reels = teks.split("\n");

  const titel = reels.find((r) => r.startsWith("# "))?.slice(2).trim();
  const teaser = reels.find((r) => /^Oor die volgende/i.test(r.trim()))?.trim();
  if (titel) stukke.push({ kop: titel, byskrif: teaser ?? "" });

  for (let i = 0; i < reels.length; i++) {
    if (reels[i].startsWith("## ")) {
      const kop = reels[i].slice(3).trim();
      let byskrif = "";
      for (let j = i + 1; j < Math.min(i + 4, reels.length); j++) {
        const r = reels[j].trim();
        if (/^\*[^*].*\*$/.test(r)) {
          byskrif = r.replace(/^\*|\*$/g, "").trim();
          break;
        }
        if (r.startsWith("## ")) break;
      }
      stukke.push({ kop, byskrif });
    }
  }
  return stukke;
}
