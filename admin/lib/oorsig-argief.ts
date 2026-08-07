/* Die oudio-cron laai elke uitgawe op as ${datum}-${uitgawe}.mp3 in die
   publieke markte-oudio bucket. markte_oorsigte hou net één oudio_url per dag
   (datum is unique), so die tabel onthou slegs die jongste uitgawe — die
   lêernaam is die enigste volledige indeks. Hierdie funksie is suiwer sodat
   die randgevalle sonder Supabase getoets kan word. */

export type Uitgawe = "oggend" | "middag" | "aand";
export type Snit = { uitgawe: Uitgawe; url: string; grootte: number };
export type Dag = { datum: string; datumWoorde: string; snitte: Snit[] };

export const UITGAWES: Uitgawe[] = ["oggend", "middag", "aand"];

const PATROON = /^(\d{4}-\d{2}-\d{2})-(oggend|middag|aand)\.mp3$/;

const datumFmt = new Intl.DateTimeFormat("af-ZA", {
  timeZone: "Africa/Johannesburg",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "2026-08-05" → "Woensdag 5 Augustus 2026" (hoofletter aan die begin). */
export function skryfDatumUit(datum: string): string {
  // middag-UTC vermy enige dag-verskuiwing wanneer na SAST omgeskakel word
  const woorde = datumFmt.format(new Date(`${datum}T12:00:00Z`));
  return woorde.charAt(0).toUpperCase() + woorde.slice(1);
}

export function groepeerLeers(
  leers: { name: string; grootte: number }[],
  publiekeBasis: string,
  maksDae = 7
): Dag[] {
  const perDatum = new Map<string, Snit[]>();

  for (const { name, grootte } of leers) {
    const pas = PATROON.exec(name);
    if (!pas) continue; // vreemde lêers breek nie die blad nie
    const [, datum, uitgawe] = pas;
    const snit: Snit = {
      uitgawe: uitgawe as Uitgawe,
      url: `${publiekeBasis}/storage/v1/object/public/markte-oudio/${name}`,
      grootte,
    };
    const bestaande = perDatum.get(datum);
    if (bestaande) bestaande.push(snit);
    else perDatum.set(datum, [snit]);
  }

  return [...perDatum.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // ISO-datums: nuutste eerste
    .slice(0, maksDae)
    .map(([datum, snitte]) => ({
      datum,
      datumWoorde: skryfDatumUit(datum),
      // vaste uitgawe-volgorde — alfabeties sou "aand" eerste plaas
      snitte: snitte.sort(
        (a, b) => UITGAWES.indexOf(a.uitgawe) - UITGAWES.indexOf(b.uitgawe)
      ),
    }));
}
