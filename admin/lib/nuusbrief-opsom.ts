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

/** Die sigblad. Excel, Numbers en Sheets maak 'n CSV sonder meer oop, dus is
 *  daar geen rede vir 'n xlsx-afhanklikheid nie.
 *
 *  Die BOM staan voor: sonder dit wys Excel op Windows "AndrÃ©" in plaas van
 *  "André", en Afrikaanse adresse dra gereeld 'n leesteken. */
export function bouCsv(rye: Intekenaar[]): string {
  const kop = ["E-pos", "Ingeteken (SAST)", "Bron"];
  const lyne = [kop.join(",")];
  for (const r of rye) {
    lyne.push([csvVeld(r.epos), csvVeld(sastTyd(r.geskep_at)), csvVeld(r.bron ?? "")].join(","));
  }
  return "﻿" + lyne.join("\r\n") + "\r\n";
}
