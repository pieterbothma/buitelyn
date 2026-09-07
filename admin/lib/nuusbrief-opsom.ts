/* Die nagtelike opsomming van nuwe nuusbrief-intekenare.

   Die suiwer dele woon hier sodat hulle toetsbaar is sonder 'n databasis of
   'n e-pos: die venster wat "nuut" beteken, en die sigblad self. */

export type Intekenaar = { epos: string; geskep_at: string; bron: string | null };

/** Die begin van die 24-uur-venster wat die cron dek. Die cron loop 20:00 SAST,
 *  dus is "nuut" alles sedert 20:00 gister. Ons werk in ISO/UTC omdat dit is
 *  wat Postgres vergelyk. */
export function vensterVanaf(nou: Date): string {
  return new Date(nou.getTime() - 24 * 60 * 60 * 1000).toISOString();
}

const SAST = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

/** SAST, want die leser sit hier — 'n UTC-tydstempel lyk 'n uur of twee verkeerd
 *  en niemand vertrou 'n lys wat die verkeerde tyd wys nie. */
export function sastTyd(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const dele = Object.fromEntries(SAST.formatToParts(d).map((p) => [p.type, p.value]));
  return `${dele.year}-${dele.month}-${dele.day} ${dele.hour}:${dele.minute}`;
}

/** CSV-veilig: 'n veld met 'n komma, 'n aanhalingsteken of 'n nuwe reël word
 *  toegevou, en 'n aanhalingsteken binne die veld word verdubbel. Sonder dit
 *  skuif een adres met 'n komma elke kolom daarna een plek op. */
export function csvVeld(waarde: string): string {
  if (/[",\n\r]/.test(waarde)) return `"${waarde.replace(/"/g, '""')}"`;
  return waarde;
}

/** Die sigblad — in Substack se INVOERFORMAAT, want dit is presies wat met
 *  hierdie lêer gebeur: ons versamel op buitelyn.com en laai op na Substack,
 *  wat die nuusbrief stuur tot ons heeltemal wegtrek.
 *
 *  Net 'n `email`-kolom. Substack lees die kop LETTERLIK, dus GEEN BOM nie:
 *  met 'n BOM heet die eerste kolom "\ufeffemail" en die invoerder sê hy kan
 *  geen e-poskolom kry nie. (Die teenoorgestelde van 'n Excel-lêer, waar die
 *  BOM juis nodig is — dieselfde data, twee lêers, twee regte antwoorde.)
 *
 *  Die tyd en die bron staan in die e-pos se lyf, nie hier nie: 'n ekstra
 *  kolom is 'n ding wat 'n mens voor die oplaai moet uitvee. */
export function bouCsv(rye: Intekenaar[]): string {
  return ["email", ...rye.map((r) => csvVeld(r.epos))].join("\r\n") + "\r\n";
}
