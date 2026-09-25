import { lunaTeks, metLuna } from "../luna";

/* Die uurlikse markoorsig vir /api/cron/markte-oorsig. Luna eerste, Gemini as
   vangnet. Hier (nie in die roete nie) sodat die toetse dit sonder die DB kan
   aanroep. */
export async function skryfOorsig(a: { tydVanDag: string; uur: number; weekdag: string; feite: string }): Promise<string | undefined> {
  const { tydVanDag, uur, weekdag, feite } = a;
  const prompt = `Dit is nou ${tydVanDag} (${uur}:30) op 'n ${weekdag} in Suid-Afrika. Skryf 'n kort Afrikaanse markoorsig (±110 woorde, een paragraaf, Buitelyn se stem: helder, bietjie speels, geen clichés) oor hoe die markdag TOT DUSVER verloop — pas jou verwysings by die tyd aan (vroegoggend: wat die dag inwag; middag: die dag se verloop; ná 17:00: hoe die JSE gesluit het). Fokus op die 2-3 interessantste bewegings (rand, JSE, goud, kripto). Geen opskrif, geen advies, geen plekhouers. Skryf suiwer hedendaagse Afrikaans — NOOIT Nederlandse, Vlaamse of Duitse woorde nie (bv. 'achtbaan' is Nederlands). As jy twyfel of 'n woord regte Afrikaans is, gebruik eerder die Engelse leenwoord (bv. 'rollercoaster') of 'n gewone Afrikaanse alternatief.
Styl: jy mag gerus een speelse beeld gebruik, maar hou die syfers presies. Syfers in Afrikaanse formaat: desimale komma en duisende met 'n spasie (R16,37; 0,5%; $4 312,20). Geen groet nie (nie "Goeie môre" nie) — begin direk by die mark. Geen Engelse terme nie (nie "crude" nie; sê olie of ruolie). Die persentasies is die dag se beweging, nie "oornag" nie. Geen em-strepe of markdown nie.

Syfers: ${feite}`;
  return metLuna(
    "markte-oorsig",
    () => lunaTeks(prompt, { maksUit: 2000, timeoutMs: 25_000 }),
    async () => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6 },
          }),
        }
      );
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() as string | undefined;
    }
  );
}
